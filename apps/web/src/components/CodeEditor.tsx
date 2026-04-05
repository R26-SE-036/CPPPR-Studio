'use client';

import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  readOnly: boolean;
}

export default function CodeEditor({ code, language, onChange, readOnly }: CodeEditorProps) {
  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={onChange}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
      {readOnly && (
        <div className="absolute top-2 right-4 bg-purple-700 text-white text-xs px-2 py-1 rounded">
          Navigator — read only
        </div>
      )}
    </div>
  );
}