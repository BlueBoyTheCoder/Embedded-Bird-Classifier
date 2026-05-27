import React, { useState, useEffect, useRef } from 'react';
import { FileJson, Download, ChevronRight, Bird, Activity, Trash2, Archive } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_BASE = `http://${window.location.hostname}:8000`;

const App = () => {
  const [jsonFiles, setJsonFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  
  // Referencja do przechowywania aktualnie wybranego pliku w interwałach
  const selectedFileRef = useRef(selectedFile);
  selectedFileRef.current = selectedFile;

  // Pobieranie listy sesji (plików)
  const fetchSessionList = () => {
    fetch(`${API_BASE}/api/results`)
      .then(res => res.json())
      .then(data => setJsonFiles(data.files))
      .catch(err => console.error("Błąd połączenia z API (lista):", err));
  };

  // Pobieranie danych z konkretnego JSON-a
  const fetchJsonData = (fileName, isBackgroundFetch = false) => {
    if (!isBackgroundFetch) setLoading(true);
    
    fetch(`${API_BASE}/data/results/${fileName}?t=${new Date().getTime()}`) // t=... zapobiega cache'owaniu w przeglądarce
      .then(res => res.json())
      .then(data => {
        setReportData(data);
        generateChartData(data);
        if (!isBackgroundFetch) setLoading(false);
      })
      .catch(() => { if (!isBackgroundFetch) setLoading(false); });
  };

  // Inicjalizacja i LIVE RELOAD
  useEffect(() => {
    fetchSessionList();

    // Mechanizm automatycznego odświeżania co 5 sekund
    const intervalId = setInterval(() => {
      fetchSessionList(); // Odświeża listę z boku
      if (selectedFileRef.current) {
        fetchJsonData(selectedFileRef.current, true); // Odświeża wykresy w tle, bez animacji ładowania
      }
    }, 5000);

    return () => clearInterval(intervalId); // Sprzątanie interwału przy wyjściu
  }, []);

  const handleFileSelect = (fileName) => {
    setSelectedFile(fileName);
    fetchJsonData(fileName, false);
  };

  // Usuwanie zawartości po zgraniu
  const handleClearSDCard = async () => {
    const isConfirmed = window.confirm("UWAGA! Czy na pewno zgrałeś już plik ZIP na telefon? Ta operacja bezpowrotnie usunie logi i nagrania z malinki!");
    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_BASE}/api/clear`, { method: 'DELETE' });
      if (response.ok) {
        alert("Pamięć malinki została wyczyszczona!");
        setJsonFiles([]);
        setSelectedFile(null);
        setReportData(null);
        setChartData([]);
      } else {
        alert("Wystąpił błąd podczas czyszczenia karty SD.");
      }
    } catch (err) {
      console.error(err);
      alert("Błąd sieci podczas czyszczenia.");
    }
  };

  const generateChartData = (data) => {
    const counts = {};
    data.forEach(entry => {
      entry.detections.forEach(det => {
        counts[det.common_name] = (counts[det.common_name] || 0) + 1;
      });
    });
    const formattedData = Object.keys(counts).map(name => ({ name, count: counts[name] })).sort((a, b) => b.count - a.count);
    setChartData(formattedData);
  };

  const getAudioUrl = (timestamp, detection, fileName) => {
    const folderName = fileName.replace('analysis_', '').replace('.json', '');
    const wavName = `${timestamp}_${detection.start_time.toFixed(1)}_${detection.end_time.toFixed(1)}.wav`;
    return `${API_BASE}/data/audio/${folderName}/${wavName}`;
  };

  const getImageUrl = (birdName) => {
    const formattedName = birdName.replace(/[ -]/g, '_');
    return `${API_BASE}/data/images/${formattedName}.jpg`; 
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Activity className="text-emerald-400" />
          <h1 className="font-bold text-xl tracking-tight text-white">Bird Analyzer</h1>
        </div>
        
        {/* Zarządzanie Kartą SD */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-800/30">
          <p className="text-xs font-semibold text-slate-500 uppercase px-1">Zarządzanie Pamięcią</p>
          <a 
            href={`${API_BASE}/api/export`}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20"
          >
            <Archive size={18} /> Zgraj paczkę (ZIP)
          </a>
          <button 
            onClick={handleClearSDCard}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/80 text-red-400 hover:text-red-300 border border-slate-700 hover:border-red-800 p-2.5 rounded-lg transition-all text-sm font-semibold"
          >
            <Trash2 size={16} /> Wyczyść Malinkę
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase px-1 mb-2 mt-2 flex justify-between">
            <span>Dostępne sesje</span>
            <span className="text-emerald-500 animate-pulse text-[10px]">● Live</span>
          </p>
          {jsonFiles.length === 0 && (
            <p className="text-slate-600 text-sm text-center py-4 italic">Brak zapisanych logów</p>
          )}
          {jsonFiles.map(file => (
            <button 
              key={file}
              onClick={() => handleFileSelect(file)}
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group ${
                selectedFile === file ? 'bg-slate-800 border border-emerald-500/50' : 'hover:bg-slate-800/50 text-slate-400 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <FileJson size={18} className={selectedFile === file ? 'text-emerald-400' : 'text-slate-500'} />
                <span className={`text-sm truncate ${selectedFile === file ? 'text-emerald-50' : ''}`}>
                  {file.split('_').slice(1).join('_').replace('.json','')}
                </span>
              </div>
              <ChevronRight size={14} className={selectedFile === file ? 'text-emerald-400' : 'opacity-0 group-hover:opacity-100'} />
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
            <p className="text-lg">Wybierz sesję analizy z menu bocznego</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <header className="flex flex-wrap justify-between items-end gap-4 mb-10 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-3xl font-black text-white mb-2">Nasłuch na żywo</h2>
                <p className="text-slate-400 font-mono text-sm">{selectedFile}</p>
              </div>
              <a 
                href={`${API_BASE}/data/results/${selectedFile}`} 
                download 
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl border border-slate-700 transition-all"
              >
                <Download size={18} /> Pobierz sam JSON
              </a>
            </header>

            {loading ? (
              <div className="flex justify-center p-20 underline decoration-emerald-500 animate-pulse">Ładowanie początkowe...</div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Wykres */}
                <div className="xl:col-span-2 bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-sm flex flex-col">
                  <h3 className="text-lg font-bold text-emerald-400 mb-6 flex items-center gap-2">
                    <Activity size={20}/> Zestawienie gatunków
                  </h3>
                  <div className="flex-1 min-h-[350px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                          <XAxis dataKey="name" stroke="#475569" angle={-45} textAnchor="end" tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <YAxis stroke="#475569" tick={{fill: '#94a3b8'}} allowDecimals={false} />
                          <Tooltip 
                            cursor={{fill: '#1e293b'}} 
                            contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px'}}
                            itemStyle={{color: '#34d399', fontWeight: 'bold'}}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 italic">Czekam na pierwszego ptaka...</div>
                    )}
                  </div>
                </div>

                {/* Lista chronologiczna (Auto-odświeżana) */}
                <div className="xl:col-span-1 flex flex-col gap-6 h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                  {[...(reportData || [])].reverse().map((entry, idx) => (
                    <div key={idx} className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 relative overflow-hidden group">
                      
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full -z-10"></div>
                      <div className="text-emerald-400 font-mono text-xs mb-4 pb-2 border-b border-slate-800">
                        {entry.timestamp.replace(/_/g, ' ')}
                      </div>

                      <div className="grid gap-4">
                        {entry.detections.map((det, dIdx) => (
                          <div key={dIdx} className="flex flex-col gap-3">
                            <div className="flex gap-4 items-center">
                              <div className="w-16 h-16 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-700">
                                <img 
                                  src={getImageUrl(det.common_name)} 
                                  alt={det.common_name}
                                  className="w-full h-full object-cover opacity-90"
                                  onError={(e) => { e.target.style.display = 'none'; }} 
                                />
                              </div>
                              <div>
                                <h4 className="text-md font-bold text-white leading-tight mb-1">{det.common_name}</h4>
                                <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase">
                                  {(det.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <audio 
                              controls 
                              src={getAudioUrl(entry.timestamp, det, selectedFile)}
                              className="h-8 w-full custom-audio"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;