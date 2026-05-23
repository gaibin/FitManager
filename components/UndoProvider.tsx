/**
 * 删除撤销 + 最近操作历史
 * 提供轻量级 undo 能力：删除后 5 秒内可恢复
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface UndoAction {
  key: string;
  message: string;
  undo: () => void;
}

interface UndoContextType {
  pushUndo: (action: UndoAction) => void;
}

const UndoContext = createContext<UndoContextType>({ pushUndo: () => {} });

export const useUndo = () => useContext(UndoContext);

export const UndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [action, setAction] = useState<UndoAction | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const pushUndo = useCallback((act: UndoAction) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAction(act);
    timerRef.current = setTimeout(() => setAction(null), 5000);
  }, []);

  const handleUndo = () => {
    if (action) { action.undo(); setAction(null); if (timerRef.current) clearTimeout(timerRef.current); }
  };

  return (
    <UndoContext.Provider value={{ pushUndo }}>
      {children}
      {action && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in">
          <div className="bg-gray-800 text-white rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 text-sm">
            <span>{action.message}</span>
            <button onClick={handleUndo}
              className="text-[#5AC8FA] font-bold hover:text-[#64D2FF] transition-colors shrink-0">
              Undo
            </button>
            <button onClick={() => setAction(null)} className="text-gray-400 hover:text-white ml-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}
    </UndoContext.Provider>
  );
};
