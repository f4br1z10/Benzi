import fs from 'node:fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const image = await loadImage('../pdfs/prev-alfonso-cebu-pdc/page-1.png');
const canvas = createCanvas(410, 130);
const context = canvas.getContext('2d');
context.fillStyle = '#fff';
context.fillRect(0, 0, canvas.width, canvas.height);
context.drawImage(image, 590, 170, 410, 130, 0, 0, 410, 130);
await fs.mkdir('../../storage/logos', { recursive: true });
await fs.writeFile('../../storage/logos/sg-clima-demo.png', canvas.toBuffer('image/png'));
