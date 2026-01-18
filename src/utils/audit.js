import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for audit log file
const AUDIT_LOG_PATH = path.join(__dirname, '../../logs/audit.log');

// Ensure logs directory exists
try {
  await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
} catch (error) {
  // Directory might already exist, ignore error
}

// Write audit event to log
export async function writeAudit(action, metadata = {}) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | ${action} | ${JSON.stringify(metadata)}\n`;
    await fs.appendFile(AUDIT_LOG_PATH, logEntry);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

// Read audit logs (last N entries)
export async function readAudit(limit = 100) {
  try {
    const data = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
    const lines = data.trim().split('\n').filter(line => line.trim() !== '');
    const parsedLogs = lines.map(line => {
      const [timestamp, action, metadataStr] = line.split(' | ');
      try {
        return {
          timestamp,
          action,
          metadata: JSON.parse(metadataStr)
        };
      } catch {
        return {
          timestamp,
          action,
          metadata: {},
          raw: metadataStr
        };
      }
    }).reverse(); // Reverse to show newest first
    
    return parsedLogs.slice(0, limit);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return empty array
      return [];
    }
    console.error('Failed to read audit log:', error);
    return [];
  }
}