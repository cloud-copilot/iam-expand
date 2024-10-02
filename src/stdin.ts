import { stdin } from 'process';
/**
 * Read from stdin until the stream ends, timeout, or an error occurs
 *
 * @returns the string input from stdin
 */
export async function readStdin(readWait: number | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    // If the input is not a TTY, we are most likely receiving data from a pipe.
    const definitelyReceivingData = !process.stdin.isTTY
    if(!readWait || readWait <= 0) {
      readWait = definitelyReceivingData ? 10_000 : 20
    }

    let data = '';
    const timeout = setTimeout(() => {
      if(data.length === 0) {
        resolve(data)
      }
    }, readWait)

    stdin.on('data', (chunk) => {
      data += chunk;
    });

    stdin.on('end', () => {
      resolve(data);
      clearTimeout(timeout)
    });

    stdin.on('error', (err) => {
      reject(err);
      clearTimeout(timeout)
    });
  });
}