import React, { useState, useEffect, useRef } from 'react';
import { FileJson, Download, ChevronRight, Bird, Activity, Trash2, Archive, Menu, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_BASE = `http://${window.location.hostname}:8000`;

const App = () => {
  const [jsonFiles, setJsonFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Reference for keeping track of the currently selected file in intervals
  const selectedFileRef = useRef(selectedFile);
  selectedFileRef.current = selectedFile;

  // Fetch session list (files)
  const fetchSessionList = () => {
    fetch(`${API_BASE}/api/results`)
      .then(res => res.json())
      .then(data => setJsonFiles(data.files))
      .catch(err => console.error("API connection error (list):", err));
  };

  // Fetch data from a specific JSON file
  const fetchJsonData = (fileName, isBackgroundFetch = false) => {
    if (!isBackgroundFetch) setLoading(true);
    
    fetch(`${API_BASE}/data/results/${fileName}?t=${new Date().getTime()}`) // t=... prevents browser caching
      .then(res => res.json())
      .then(data => {
        setReportData(data);
        generateChartData(data);
        if (!isBackgroundFetch) setLoading(false);
      })
      .catch(() => { if (!isBackgroundFetch) setLoading(false); });
  };

  // Initialization and LIVE RELOAD
  useEffect(() => {
    fetchSessionList();

    // Automatic refresh mechanism every 5 seconds
    const intervalId = setInterval(() => {
      fetchSessionList(); // Refreshes the sidebar list
      if (selectedFileRef.current) {
        fetchJsonData(selectedFileRef.current, true); // Refreshes charts in the background without loading animation
      }
    }, 5000);

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []);

  const handleFileSelect = (fileName) => {
    setSelectedFile(fileName);
    fetchJsonData(fileName, false);
    setIsSidebarOpen(false); // Automatically close sidebar drawer on mobile after selecting a session
  };

  // Delete storage content after download
  const handleClearSDCard = async () => {
    const isConfirmed = window.confirm("WARNING! Are you sure you have already downloaded the ZIP package to your phone? This operation will permanently delete logs and recordings from the Raspberry Pi!");
    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_BASE}/api/clear`, { method: 'DELETE' });
      if (response.ok) {
        alert("Raspberry Pi storage has been cleared!");
        setJsonFiles([]);
        setSelectedFile(null);
        setReportData(null);
        setChartData([]);
        setIsSidebarOpen(false);
      } else {
        alert("An error occurred while clearing the SD card.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error during clearance.");
    }
  };

  const generateChartData = (data) => {
    const counts = {};
    data.forEach(entry => {
      if(entry.detections) {
        entry.detections.forEach(det => {
          counts[det.common_name] = (counts[det.common_name] || 0) + 1;
        });
      }
    });
    const formattedData = Object.keys(counts).map(name => ({ name, count: counts[name] })).sort((a, b) => b.count - a.count);
    setChartData(formattedData);
  };

  const getAudioUrl = (audioFile, detection, fileName) => {
    const folderName = fileName.replace('analysis_', '').replace('.json', '');
    // Constructs the filename matching the format seen on disk: bird_[start]_[end].wav
    const wavName = `bird_${detection.start_time.toFixed(1)}_${detection.end_time.toFixed(1)}.wav`;
    return `${API_BASE}/data/audio/${folderName}/${wavName}`;
  };

  const getImageUrl = (birdName) => {
    const formattedName = birdName.replace(/[ -]/g, '_');
    return `${API_BASE}/data/images/${formattedName}.jpg`; 
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="text-emerald-400" />
          <h1 className="font-bold text-lg tracking-tight text-white">Bird Analyzer</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2 text-slate-400 hover:text-white transition-colors focus:outline-none"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Backdrop Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity backdrop-blur-xs"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 border-r border-slate-800 bg-slate-900 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-slate-800 hidden lg:flex items-center gap-3">
          <Activity className="text-emerald-400" />
          <h1 className="font-bold text-xl tracking-tight text-white">Bird Analyzer</h1>
        </div>
        
        {/* Storage Management */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-800/30">
          <p className="text-xs font-semibold text-slate-500 uppercase px-1">Storage Management</p>
          <a 
            href={`${API_BASE}/api/export`}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20"
          >
            <Archive size={18} /> Export package (ZIP)
          </a>
          <button 
            onClick={handleClearSDCard}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/80 text-red-400 hover:text-red-300 border border-slate-700 hover:border-red-800 p-2.5 rounded-lg transition-all text-sm font-semibold"
          >
            <Trash2 size={16} /> Clear Raspberry Pi
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase px-1 mb-2 mt-2 flex justify-between">
            <span>Available sessions</span>
            <span className="text-emerald-500 animate-pulse text-[10px]">● Live</span>
          </p>
          {jsonFiles.length === 0 && (
            <p className="text-slate-600 text-sm text-center py-4 italic">No saved logs</p>
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
      <div className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 p-4 sm:p-8">
        {!selectedFile ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 py-12">
            <div className="bg-slate-900 p-6 sm:p-8 rounded-full mb-6 border border-slate-800">
              <Bird size={64} className="opacity-20 sm:w-20 sm:h-20" />
            </div>
            <p className="text-base sm:text-lg text-center px-4">Select an analysis session from the sidebar</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-10 pb-6 border-b border-slate-800">
              <div className="min-w-0 w-full sm:w-auto">
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Live Monitoring</h2>
                <p className="text-slate-400 font-mono text-xs sm:text-sm truncate">{selectedFile}</p>
              </div>
              <a 
                href={`${API_BASE}/data/results/${selectedFile}`} 
                download 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl border border-slate-700 transition-all text-sm font-semibold"
              >
                <Download size={16} /> Download JSON only
              </a>
            </header>

            {loading ? (
              <div className="flex justify-center p-20 underline decoration-emerald-500 animate-pulse text-sm">Initial loading...</div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
                
                {/* Chart */}
                <div className="xl:col-span-2 bg-slate-900/50 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-sm flex flex-col">
                  <h3 className="text-base sm:text-lg font-bold text-emerald-400 mb-6 flex items-center gap-2">
                    <Activity size={18}/> Species Overview
                  </h3>
                  <div className="w-full h-[280px] sm:h-[400px]">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 30 }}>
                          <XAxis dataKey="name" stroke="#475569" angle={-45} textAnchor="end" tick={{fontSize: 10, fill: '#94a3b8'}} height={60} />
                          <YAxis stroke="#475569" tick={{fontSize: 11, fill: '#94a3b8'}} allowDecimals={false} />
                          <Tooltip 
                            cursor={{fill: '#1e293b'}} 
                            contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px'}}
                            itemStyle={{color: '#34d399', fontWeight: 'bold', fontSize: '13px'}}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">Waiting for the first bird...</div>
                    )}
                  </div>
                </div>

                {/* Chronological List */}
                <div className="xl:col-span-1 flex flex-col gap-4 sm:gap-6 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                  {[...(reportData || [])].reverse().map((entry, idx) => (
                    entry.detections && (
                      <div key={idx} className="bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-800 relative overflow-hidden group shrink-0 shadow-xs">
                        
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full -z-10"></div>
                        <div className="text-emerald-400 font-mono text-[11px] mb-4 pb-2 border-b border-slate-800/60">
                          {entry.timestamp ? entry.timestamp.replace(/_/g, ' ') : "No date"}
                        </div>

                        <div className="grid gap-4">
                          {entry.detections.map((det, dIdx) => (
                            <div key={dIdx} className="flex flex-col gap-3">
                              <div className="flex gap-3 sm:gap-4 items-center">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-700 relative flex items-center justify-center">
                                  <Bird className="absolute text-slate-600 z-0" size={20} />
                                  <img 
                                    src={getImageUrl(det.common_name)} 
                                    alt={det.common_name}
                                    loading="lazy"
                                    className="w-full h-full object-cover relative z-10 transition-opacity duration-300"
                                    onError={(e) => { e.target.style.opacity = '0'; }} 
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm sm:text-md font-bold text-white leading-tight mb-1 truncate">{det.common_name}</h4>
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400 text-[9px] font-bold border border-emerald-500/20 uppercase">
                                    {(det.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <audio 
                                controls 
                                preload="metadata"
                                src={getAudioUrl(entry.file, det, selectedFile)}
                                className="h-8 w-full custom-audio text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
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