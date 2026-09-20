import { readFile, writeFile, readdir, rename, rm } from 'fs/promises';
import { resolve } from 'path';
import type { ToolRegistry } from './registry.js';

export async function registerFileTools(registry: ToolRegistry) {
  registry.register({
    name: 'file_operation',
    description: 'Perform file system operations like read, create, list, move, delete',
    category: 'files',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'File operation to perform',
          enum: ['read', 'create', 'list', 'move', 'delete'],
        },
        path: { type: 'string', description: 'Target file or directory path' },
        content: { type: 'string', description: 'Content for create operation' },
        destination: { type: 'string', description: 'Destination path for move operation' },
      },
      required: ['operation', 'path'],
    },
    requiresConfirmation: true,
    execute: async (args: Record<string, unknown>) => {
      try {
        const operation = args.operation as string;
        const targetPath = resolve(args.path as string);
        const content = args.content as string | undefined;
        const destination = args.destination as string | undefined;

        switch (operation) {
          case 'read': {
            const data = await readFile(targetPath, 'utf8');
            return { success: true, message: data };
          }

          case 'create':
            if (!content) return { success: false, message: 'content is required for create' };
            await writeFile(targetPath, content, 'utf8');
            return { success: true, message: `Created ${targetPath}` };

          case 'list': {
            const files = await readdir(targetPath);
            return { success: true, message: `Files: ${files.join(', ')}`, data: files };
          }

          case 'move':
            if (!destination) return { success: false, message: 'destination required for move' };
            const destPath = resolve(destination);
            await rename(targetPath, destPath);
            return { success: true, message: `Moved to ${destPath}` };

          case 'delete':
            await rm(targetPath, { recursive: true, force: true });
            return { success: true, message: `Deleted ${targetPath}` };

          default:
            return { success: false, message: `Unknown operation: ${operation}` };
        }
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
  });
}
