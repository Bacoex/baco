import React from 'react';

interface DebugViewProps {
  data: any;
  title?: string;
}

export const DebugView: React.FC<DebugViewProps> = ({ data, title }) => {
  return (
    <div className="p-4 bg-gray-800 text-white rounded mb-4 overflow-auto max-h-[500px]">
      {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
      <pre className="whitespace-pre-wrap text-sm font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default DebugView;