import { useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useBlocks } from './useBlocks';
import { useBreaks } from './useBreaks';
import type { Block, Break } from '../models';

type ExportFormat = 'json' | 'csv';

interface ExportData {
  exportedAt: string;
  version: string;
  blocks: Block[];
  breaks: Break[];
}

const formatTimestamp = (ts: number): string => {
  return new Date(ts).toISOString();
};

const blocksToCsv = (blocks: Block[]): string => {
  const headers = [
    'id',
    'date',
    'startedAt',
    'completedAt',
    'taskId',
    'isValid',
    'finishLinePictured',
    'notInterrupted',
    'committedToFocus',
    'phoneSeparate',
    'celebrated',
    'notes',
  ];

  const rows = blocks.map((block) => [
    block.id,
    block.date,
    formatTimestamp(block.startedAt),
    block.completedAt ? formatTimestamp(block.completedAt) : '',
    block.taskId || '',
    block.isValid.toString(),
    block.meta.finishLinePictured.toString(),
    block.meta.notInterrupted.toString(),
    block.meta.committedToFocus.toString(),
    block.meta.phoneSeparate.toString(),
    block.meta.celebrated.toString(),
    block.notes ? `"${block.notes.replace(/"/g, '""')}"` : '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

interface UseExportReturn {
  exportData: (format: ExportFormat) => Promise<boolean>;
  exportBlocks: (format: ExportFormat) => Promise<boolean>;
}

export const useExport = (): UseExportReturn => {
  const { blocks } = useBlocks();
  const { breaks } = useBreaks();

  const exportData = useCallback(
    async (format: ExportFormat): Promise<boolean> => {
      try {
        const timestamp = new Date().toISOString().split('T')[0];
        const defaultPath =
          format === 'json'
            ? `sanjou-export-${timestamp}.json`
            : `sanjou-blocks-${timestamp}.csv`;

        const filePath = await save({
          defaultPath,
          filters:
            format === 'json'
              ? [{ name: 'JSON', extensions: ['json'] }]
              : [{ name: 'CSV', extensions: ['csv'] }],
        });

        if (!filePath) {
          return false; // User cancelled
        }

        let content: string;

        if (format === 'json') {
          const exportData: ExportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            blocks,
            breaks,
          };
          content = JSON.stringify(exportData, null, 2);
        } else {
          // CSV export - blocks only (most useful for spreadsheet analysis)
          content = blocksToCsv(blocks);
        }

        await writeTextFile(filePath, content);
        return true;
      } catch (error) {
        console.error('Export failed:', error);
        return false;
      }
    },
    [blocks, breaks]
  );

  const exportBlocks = useCallback(
    async (format: ExportFormat): Promise<boolean> => {
      return exportData(format);
    },
    [exportData]
  );

  return {
    exportData,
    exportBlocks,
  };
};
