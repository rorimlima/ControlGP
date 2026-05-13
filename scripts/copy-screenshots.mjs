import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const dir = join('public', 'screenshots');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const base = 'C:\\Users\\ELIELETRO\\.gemini\\antigravity\\brain\\7e290517-cade-4a33-b22a-e403a5ea5cbc';
const src1 = join(base, 'screenshot_mobile_dashboard_1778693977984.png');
const src2 = join(base, 'screenshot_desktop_lancamentos_1778693988488.png');

copyFileSync(src1, join(dir, 'screenshot-mobile.png'));
copyFileSync(src2, join(dir, 'screenshot-desktop.png'));
console.log('Screenshots copied successfully!');
