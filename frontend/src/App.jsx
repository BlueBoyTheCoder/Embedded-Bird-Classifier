import React, { useState, useEffect } from 'react';
import { FileJson, Music, Download, ChevronRight, Bird, PlayCircle, Activity } from 'lucide-react';

// Dynamiczne pobieranie adresu IP komputera
const API_BASE = `http://${window.location.hostname}:8000`;

const App = () => {
  const [jsonFiles, setJsonFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/results`)
      .then(res => res.json())
      .then(data => setJsonFiles(data.files))
      .catch(err => console.error("Błąd połączenia z API:", err));
  }, []);

  const loadJsonContent = (fileName) => {
    setLoading(true);
    setSelectedFile(fileName);
    fetch(`${API_BASE}/data/results/${fileName}`)
      .then(res => res.json())
      .then(data => {
        setReportData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const getAudioUrl = (timestamp, detection, fileName) => {
    // Wyciąga "2026-05-14_13-34-22" z "analysis_2026-05-14_13-34-22.json"
    const folderName = fileName.replace('analysis_', '').replace('.json', '');
    const wavName = `${timestamp}_${detection.start_time.toFixed(1)}_${detection.end_time.toFixed(1)}.wav`;
    return `${API_BASE}/data/audio/${folderName}/${wavName}`;
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Activity className="text-emerald-400" />
          <h1 className="font-bold text-xl tracking-tight text-white">Bird Analyzer</h1>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-4">Dostępne sesje</p>
          {jsonFiles.map(file => (
            <button 
              key={file}
              onClick={() => loadJsonContent(file)}
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group ${
                selectedFile === file ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <FileJson size={18} className={selectedFile === file ? 'text-white' : 'text-emerald-500'} />
                <span className="text-sm truncate">{file.split('_').slice(1).join('_').replace('.json','')}</span>
              </div>
              <ChevronRight size={14} className={selectedFile === file ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 p-8">
        {!selectedFile ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <div className="bg-slate-900 p-8 rounded-full mb-6 border border-slate-800">
              <Bird size={80} className="opacity-20" />
            </div>
            <p className="text-lg">Wybierz sesję analizy, aby wyświetlić detekcje</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <header className="flex flex-wrap justify-between items-end gap-4 mb-10 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-3xl font-black text-white mb-2">Szczegóły Analizy</h2>
                <p className="text-slate-400 font-mono text-sm">{selectedFile}</p>
              </div>
              <a 
                href={`${API_BASE}/data/results/${selectedFile}`} 
                download 
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl border border-slate-700 transition-all"
              >
                <Download size={18} /> Pobierz JSON
              </a>
            </header>

            {loading ? (
              <div className="flex justify-center p-20 underline decoration-emerald-500 animate-pulse">Ładowanie danych...</div>
            ) : (
              <div className="grid gap-6">
                {reportData?.map((entry, idx) => (
                  <div key={idx} className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg font-mono text-xs">
                        {entry.timestamp}
                      </div>
                      <div className="h-px flex-1 bg-slate-800"></div>
                    </div>

                    <div className="grid gap-4">
                      {entry.detections.map((det, dIdx) => (
                        <div key={dIdx} className="bg-slate-800/40 rounded-xl p-5 flex flex-wrap items-center justify-between gap-6 border border-slate-800/50">
                          <div className="flex-1 min-w-[250px]">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-xl font-bold text-white">{det.common_name}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest">
                                {(det.confidence * 100).toFixed(0)}% Match
                              </span>
                            </div>
                            <p className="text-slate-400 italic text-sm mb-2">{det.scientific_name}</p>
                            <div className="flex gap-4 text-xs font-mono text-slate-500">
                              <span>START: {det.start_time}s</span>
                              <span>END: {det.end_time}s</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                            <audio 
                              controls 
                              src={getAudioUrl(entry.timestamp, det, selectedFile)}
                              className="h-10 w-48 custom-audio"
                            />
                            <a 
                              href={getAudioUrl(entry.timestamp, det, selectedFile)} 
                              download
                              className="p-3 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                            >
                              <Download size={20} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;