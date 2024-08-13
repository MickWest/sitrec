import MP4Box from "../mp4box.all.js";
//var MP4Box = require('mp4box');  // node.js version
import {Sit} from "../../Globals";

export class MP4Source {
  constructor() {
    this.file = MP4Box.createFile();
    this.file.onError = console.error.bind(console);
    this.file.onReady = this.onReady.bind(this);
    this.file.onSamples = this.onSamples.bind(this);

    this.info = null;
    this._info_resolver = null;

  }

  loadURI(uri, callback, error) {
    fetch(uri).then(response => {
      const reader = response.body.getReader();
      if (response.status === 200) {
        this.loadFromReader(reader, callback)
      } else {
        if (error !== undefined) {
          error(uri)
        }
      }
    })
  }


  loadFromReader(reader, callback) {
    let offset = 0;
    let mp4File = this.file;

    function appendBuffers({done, value}) {
      if (done) {
        mp4File.flush();
        callback()
        return;
      }
//      console.log("appendBuffers value.length = " + value.length + " done = " + done)

      let buf = value.buffer;
      buf.fileStart = offset;

      offset += buf.byteLength;

      mp4File.appendBuffer(buf);

      return reader.read().then(appendBuffers);
    }

    return reader.read().then(appendBuffers);
  }

  onReady(info) {
    // TODO: Generate configuration changes.
    this.info = info;
    //console.log("MP4Source onReady info = ", info)
    var videoTrack = info.tracks.find(track => track.type === 'video');
    if (videoTrack) {
      var duration = videoTrack.movie_duration; // Duration in timescale units
      var timescale = videoTrack.movie_timescale; // Timescale (units per second)
      this.durationInSeconds = duration / timescale;

      console.log('Duration: ', duration, 'Timescale: ', timescale);
      console.log('Duration in seconds = ' + this.durationInSeconds);

      // var frameRate = videoTrack.video.sample_entries[0].sample_rate || calculateFrameRate(videoTrack);
      //
      // var totalFrames = (frameRate * duration) / timescale;

      this.totalFrames = videoTrack.nb_samples;
      console.log('Estimated Number of Frames: ', this.totalFrames);

      var framesPerSecond = this.totalFrames / this.durationInSeconds;
      // we want whole numbers like 30,60,50,25,24, or NTSC 29.97
      // so round to nearest 0.01
      framesPerSecond = Math.round(framesPerSecond * 100) / 100;

        console.log('Frames Per Second: ', framesPerSecond);

      // is it something reasonable?
        if (framesPerSecond > 0 && framesPerSecond < 100) {
            this.fps = framesPerSecond;
        } else {
            console.warn('Invalid frame rate: ', framesPerSecond, " setting to 30");
            this.fps = 30;
        }



    }

    if (this._info_resolver) {
      this._info_resolver(info);
      this._info_resolver = null;
    }
  }

  getInfo() {
    if (this.info)
      return Promise.resolve(this.info);

    return new Promise((resolver) => { this._info_resolver = resolver; });
  }

  getAvccBox() {
    // TODO: make sure this is coming from the right track.
    //return this.file.moov.traks[0].mdia.minf.stbl.stsd.entries[0].avcC

    // https://github.com/w3c/webcodecs/pull/525/commits/520b4165d7d7a698d56ee6b94ed60105f6e9085d
    const traks = this.file.moov.traks.filter(trak => trak.mdia.minf.stbl.stsd.entries[0].avcC);
    return traks[0].mdia.minf.stbl.stsd.entries[0].avcC;

  }

  start(track, onChunk) {
    this._onChunk = onChunk;
    this.file.setExtractionOptions(track.id);
    this.file.start();
  }

  onSamples(track_id, ref, samples) {
    for (const sample of samples) {
      const type = sample.is_sync ? "key" : "delta";

      const chunk = new EncodedVideoChunk({
        type: type,
        timestamp: sample.cts,
        duration: sample.duration,
        data: sample.data
      });

      this._onChunk(chunk);
    }
  }
}

class Writer {
  constructor(size) {
    this.data = new Uint8Array(size);
    this.idx = 0;
    this.size = size;
  }

  getData() {
    if(this.idx != this.size)
      throw "Mismatch between size reserved and sized used"

    return this.data.slice(0, this.idx);
  }

  writeUint8(value) {
    this.data.set([value], this.idx);
    this.idx++;
  }

  writeUint16(value) {
    // TODO: find a more elegant solution to endianess.
    var arr = new Uint16Array(1);
    arr[0] = value;
    var buffer = new Uint8Array(arr.buffer);
    this.data.set([buffer[1], buffer[0]], this.idx);
    this.idx +=2;
  }

  writeUint8Array(value) {
    this.data.set(value, this.idx);
    this.idx += value.length;
  }
}

export class MP4Demuxer {

  constructor(source) {
    this.source = source;
  }

  getExtradata(avccBox) {
    var i;
    var size = 7;
    for (i = 0; i < avccBox.SPS.length; i++) {
      // nalu length is encoded as a uint16.
      size+= 2 + avccBox.SPS[i].length;
    }
    for (i = 0; i < avccBox.PPS.length; i++) {
      // nalu length is encoded as a uint16.
      size+= 2 + avccBox.PPS[i].length;
    }

    var writer = new Writer(size);

    writer.writeUint8(avccBox.configurationVersion);
    writer.writeUint8(avccBox.AVCProfileIndication);
    writer.writeUint8(avccBox.profile_compatibility);
    writer.writeUint8(avccBox.AVCLevelIndication);
    writer.writeUint8(avccBox.lengthSizeMinusOne + (63<<2));

    writer.writeUint8(avccBox.nb_SPS_nalus + (7<<5));
    for (i = 0; i < avccBox.SPS.length; i++) {
      writer.writeUint16(avccBox.SPS[i].length);
      writer.writeUint8Array(avccBox.SPS[i].nalu);
    }

    writer.writeUint8(avccBox.nb_PPS_nalus);
    for (i = 0; i < avccBox.PPS.length; i++) {
      writer.writeUint16(avccBox.PPS[i].length);
      writer.writeUint8Array(avccBox.PPS[i].nalu);
    }

    return writer.getData();
  }

  async getConfig() {
    let info = await this.source.getInfo();
    this.track = info.videoTracks[0];

    var extradata = this.getExtradata(this.source.getAvccBox());

    let config = {
      codec: this.track.codec,
      codedHeight: this.track.video.height,
      codedWidth: this.track.video.width,
      description: extradata,
    }

    return Promise.resolve(config);
  }

  start(onChunk) {
    this.source.start(this.track, onChunk);
  }
}
