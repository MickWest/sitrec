import { isLocal, SITREC_SERVER } from '../config';

export function writeToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log('Text copied to clipboard');
    })
    .catch((error) => {
      console.error('Error copying text to clipboard: ', error);
    });
}

export async function getShortURL(url) {
  if (isLocal) {
    return url;
  }

  // URL-encode the original URL
  const encoded_url = encodeURIComponent(url);

  // Construct the URL for the PHP shortener
  const shortenerUrl = `${SITREC_SERVER}shortener.php?url=${encoded_url}`;

  // Fetch the shortened URL
  return fetch(shortenerUrl).then((response) => {
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    return response.text();
  });
}
