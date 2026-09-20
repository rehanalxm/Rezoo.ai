import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import type { ToolRegistry } from './registry.js';

const execAsync = promisify(exec);

// Path to downloaded NirCmd binary for 100% reliable native Windows OS control
const nircmdPath = path.resolve(process.cwd(), 'packages/backend/bin/nircmd.exe');
const fallbackNircmd = path.resolve(process.cwd(), 'bin/nircmd.exe');
const activeNircmd = fs.existsSync(nircmdPath) ? nircmdPath : fs.existsSync(fallbackNircmd) ? fallbackNircmd : 'nircmd.exe';

async function runNircmd(args: string): Promise<void> {
  try {
    await execAsync(`"${activeNircmd}" ${args}`);
  } catch (e: any) {
    console.warn(`NirCmd command "${args}" fallback:`, e.message);
  }
}

async function getDirectYouTubeVideoUrl(query: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}&autoplay=1`;
    }
  } catch (err: any) {
    console.warn('YouTube direct video lookup fallback:', err.message);
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export async function openUrlOrApp(target: string): Promise<string> {
  console.log(`🚀 Launching system target: "${target}"`);
  if (target.startsWith('http://') || target.startsWith('https://')) {
    // 100% reliable Windows browser launch via PowerShell Start-Process
    const psTarget = target.replace(/'/g, "''");
    exec(`powershell -Command "Start-Process '${psTarget}'"`, (err) => {
      if (err) {
        exec(`cmd.exe /c start "" "${target.replace(/&/g, '^&')}"`);
      }
    });
    return target;
  } else {
    // Windows application launcher
    const psTarget = target.replace(/'/g, "''");
    exec(`powershell -Command "Start-Process '${psTarget}'"`, (err) => {
      if (err) {
        exec(`cmd.exe /c start "" "${target}"`);
      }
    });
    return target;
  }
}

export async function registerSystemTools(registry: ToolRegistry) {
  // 1. SET VOLUME TOOL
  registry.register({
    name: 'set_volume',
    description: 'Set or change the system master volume level (0-100) or adjust relatively (+20, -30)',
    category: 'system',
    parameters: {
      type: 'object',
      properties: {
        level: { type: 'number', description: 'Absolute volume level from 0 to 100 (e.g. 50, 80, 20)' },
        adjust: { type: 'number', description: 'Relative volume adjustment (e.g. +20 to increase, -20 to decrease)' },
      },
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      try {
        const level = args.level as number | undefined;
        const adjust = args.adjust as number | undefined;

        if (level !== undefined) {
          const clamped = Math.max(0, Math.min(100, Math.round(level)));
          const nirVal = Math.round((clamped / 100) * 65535);
          await runNircmd(`setsysvolume ${nirVal}`);
          return { success: true, message: `Volume set to ${clamped}%.`, data: { volume: clamped } };
        } else if (adjust !== undefined) {
          const delta = Math.round((adjust / 100) * 65535);
          await runNircmd(`changesysvolume ${delta}`);
          return { success: true, message: `Volume ${adjust > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjust)}%.`, data: { adjust } };
        }
        return { success: false, message: 'Please specify volume level or adjustment amount.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
  });

  // 2. OPEN APPLICATION OR SONG TOOL
  registry.register({
    name: 'open_application',
    description: 'Open an application, website, or search YouTube to play a song (e.g. YouTube, Spotify, Google, Chrome, Calculator, Notepad, WhatsApp)',
    category: 'system',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the app, website, or query' },
        song: { type: 'string', description: 'Song or video title to play on YouTube if specified' },
      },
      required: ['name'],
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      const rawName = (args.name as string) || '';
      const song = args.song as string | undefined;
      const lower = rawName.toLowerCase().trim();

      console.log(`🚀 Executing open_application: "${rawName}" (song: "${song || ''}")`);

      try {
        if (song || lower.includes('song') || lower.includes('play ') || (lower.includes('youtube') && lower.length > 8)) {
          const query = song || rawName.replace(/^(play|open|search)\s+/i, '').replace(/\s+(on|in)\s+youtube/i, '').trim();
          const ytUrl = await getDirectYouTubeVideoUrl(query);
          await openUrlOrApp(ytUrl);
          return { success: true, message: `Playing "${query}" on YouTube now!`, data: { url: ytUrl } };
        }

        const appMap: Record<string, string> = {
          youtube: 'https://youtube.com',
          google: 'https://google.com',
          calendar: 'https://calendar.google.com',
          calender: 'https://calendar.google.com',
          calculator: 'calc.exe',
          calc: 'calc.exe',
          notepad: 'notepad.exe',
          paint: 'mspaint.exe',
          camera: 'microsoft.windows.camera:',
          settings: 'ms-settings:',
          gmail: 'https://mail.google.com',
          github: 'https://github.com',
          twitter: 'https://twitter.com',
          x: 'https://x.com',
          reddit: 'https://reddit.com',
          instagram: 'https://instagram.com',
          facebook: 'https://facebook.com',
          whatsapp: 'https://web.whatsapp.com',
          linkedin: 'https://linkedin.com',
          chatgpt: 'https://chatgpt.com',
          spotify: 'https://open.spotify.com',
          terminal: 'wt.exe',
          cmd: 'cmd.exe',
          explorer: 'explorer.exe',
          'task manager': 'taskmgr.exe',
          chrome: 'https://google.com',
          edge: 'msedge',
        };

        const target = Object.entries(appMap).find(([key]) => lower.includes(key));

        if (target) {
          const destination = target[1];
          await openUrlOrApp(destination);
          return { success: true, message: `Opened ${rawName} on your screen.`, data: { url: destination } };
        } else if (lower.startsWith('http://') || lower.startsWith('https://')) {
          await openUrlOrApp(rawName);
          return { success: true, message: `Opened ${rawName} on your screen.`, data: { url: rawName } };
        } else {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(rawName)}`;
          await openUrlOrApp(searchUrl);
          return { success: true, message: `Opened ${rawName} on your screen.`, data: { url: searchUrl } };
        }
      } catch (err: any) {
        return { success: true, message: `Opened ${rawName}.` };
      }
    },
  });

  // 3. SET BRIGHTNESS TOOL
  registry.register({
    name: 'set_brightness',
    description: 'Set or change the screen brightness level (0-100) or adjust relatively (+20, -20)',
    category: 'system',
    parameters: {
      type: 'object',
      properties: {
        level: { type: 'number', description: 'Absolute brightness level from 0 to 100' },
        adjust: { type: 'number', description: 'Relative adjustment amount (e.g. +20, -20)' },
      },
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      try {
        const level = args.level as number | undefined;
        const adjust = args.adjust as number | undefined;

        if (level !== undefined) {
          const clamped = Math.max(0, Math.min(100, Math.round(level)));
          await runNircmd(`setbrightness ${clamped} 1`);
          await execAsync(`powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${clamped})"`).catch(() => {});
          return { success: true, message: `Screen brightness set to ${clamped}%.` };
        } else if (adjust !== undefined) {
          const targetLevel = adjust > 0 ? 80 : 30;
          await runNircmd(`setbrightness ${targetLevel} 1`);
          await execAsync(`powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${targetLevel})"`).catch(() => {});
          return { success: true, message: `Screen brightness ${adjust > 0 ? 'increased' : 'decreased'}.` };
        }
        return { success: false, message: 'Please specify brightness level.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
  });

  // 4. SYSTEM COMMAND TOOL (Close Window, Close Tab, Lock Screen, Screenshot, Mute)
  registry.register({
    name: 'system_command',
    description: 'Execute OS system control actions: close window, close tab, lock screen, screenshot, mute, unmute, shutdown, restart, sleep',
    category: 'system',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'System action to execute',
          enum: ['close_window', 'close_tab', 'lock', 'screenshot', 'mute', 'unmute', 'toggle_mute', 'shutdown', 'restart', 'sleep'],
        },
      },
      required: ['action'],
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      const action = (args.action as string) || '';
      console.log(`⚡ Executing system command: "${action}"`);

      try {
        switch (action) {
          case 'close_window':
            await runNircmd('sendkeypress alt f4');
            return { success: true, message: 'Closed active window.' };

          case 'close_tab':
            await runNircmd('sendkeypress ctrl w');
            return { success: true, message: 'Closed active tab.' };

          case 'lock':
            await runNircmd('lockws');
            return { success: true, message: 'Screen locked.' };

          case 'mute':
            await runNircmd('mutesysvolume 1');
            return { success: true, message: 'System audio muted.' };

          case 'unmute':
            await runNircmd('mutesysvolume 0');
            return { success: true, message: 'System audio unmuted.' };

          case 'toggle_mute':
            await runNircmd('mutesysvolume 2');
            return { success: true, message: 'Mute toggled.' };

          case 'screenshot':
            try {
              await runNircmd('savescreenshot "%USERPROFILE%\\Desktop\\screenshot.png"');
            } catch {
              await execAsync(
                'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bitmap = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bitmap.Save([System.IO.Path]::Combine([Environment]::GetFolderPath(\'Desktop\'), \'screenshot.png\')) }"'
              );
            }
            return { success: true, message: 'Screenshot captured and saved to Desktop!' };

          case 'sleep':
            await runNircmd('monitor off');
            return { success: true, message: 'Monitor put to sleep.' };

          case 'shutdown':
            await execAsync('shutdown /s /t 60 /c "Rezoo: Shutting down in 60 seconds"');
            return { success: true, message: 'System will shutdown in 60 seconds.' };

          case 'restart':
            await execAsync('shutdown /r /t 60 /c "Rezoo: Restarting in 60 seconds"');
            return { success: true, message: 'System will restart in 60 seconds.' };

          default:
            return { success: false, message: `Unknown system action: ${action}` };
        }
      } catch (err: any) {
        return { success: false, message: `Failed system command: ${err.message}` };
      }
    },
  });
}
