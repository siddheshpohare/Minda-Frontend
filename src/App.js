import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Settings, Activity, Thermometer, Gauge, Zap, Clock, RotateCcw, Wifi, WifiOff, TrendingUp, AlertCircle, Upload, FileText, RefreshCw, Download, X } from 'lucide-react';

const SparkMindaDashboard = () => {
  // API Configuration
  const API_BASE_URL = 'http://localhost:5000/api';
  
  // State for API connection
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // State for API data
  const [predictionData, setPredictionData] = useState([]);
  const [machines, setMachines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [availableFeatures, setAvailableFeatures] = useState([]);

  // State for dropdowns and controls
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedParameter, setSelectedParameter] = useState('metal_temperature');
  const [metalTempThreshold, setMetalTempThreshold] = useState(755);
  const [solidificationTimeThreshold, setSolidificationTimeThreshold] = useState(50);
  const [tiltingAngleThreshold, setTiltingAngleThreshold] = useState(35);
  const [tiltingSpeedThreshold, setTiltingSpeedThreshold] = useState(25);
  const [topDieTempThreshold, setTopDieTempThreshold] = useState(370);

  const [metalTempLowerThreshold, setMetalTempLowerThreshold] = useState(675);
  const [solidificationTimeLowerThreshold, setSolidificationTimeLowerThreshold] = useState(40);
  const [tiltingAngleLowerThreshold, setTiltingAngleLowerThreshold] = useState(20);
  const [tiltingSpeedLowerThreshold, setTiltingSpeedLowerThreshold] = useState(10);
  const [topDieTempLowerThreshold, setTopDieTempLowerThreshold] = useState(300);

  // Parameter options
  const parameters = [
    { value: 'metal_temperature', label: 'Metal Temperature (°C)', icon: Thermometer },
    { value: 'solidification_time', label: 'Solidification Time (sec)', icon: Clock },
    { value: 'tilting_angle', label: 'Tilting Angle (°)', icon: RotateCcw },
    { value: 'tilting_speed', label: 'Tilting Speed (rpm)', icon: Gauge },
    { value: 'top_die_temperature', label: 'Top Die Temperature (°C)', icon: Zap }
  ];

  // File upload handler
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop();
      if (allowedExtensions.includes(fileExtension)) {
        setSelectedFile(file);
        setUploadStatus('');
      } else {
        setUploadStatus('Please select a valid Excel or CSV file.');
        setSelectedFile(null);
      }
    }
  };

  // Upload file to server
  const uploadFile = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading file and training model...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('auto_train', 'true');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();
      
      if (response.ok && result.success) {
        setUploadStatus(result.auto_train_status?.message || 'File uploaded successfully!');
        await fetchAllData();
      } else {
        setUploadStatus(result.message || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
        setSelectedFile(null);
      }, 5000);
    }
  };
  
  // Fetch all data in one go
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const isHealthy = await checkAPIHealth();
      if (isHealthy) {
        await Promise.all([
          fetchMachines(),
          fetchPredictions(),
          fetchAlerts(),
          fetchMetrics(),
        ]);
      }
    } catch (error) {
        console.error("Failed to fetch all data:", error);
    } finally {
        setIsLoading(false);
    }
  }, []); 

  // API Functions
  const checkAPIHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        setIsConnected(true);
        return true;
      }
      setIsConnected(false);
      return false;
    } catch (error) {
      console.error('API health check failed:', error);
      setIsConnected(false);
      return false;
    }
  };

  const fetchMachines = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/machines`);
      const data = await response.json();
      if (data.success && data.machines.length > 0) {
        setMachines(data.machines);
        if (!data.machines.includes(selectedMachine)) {
          setSelectedMachine(data.machines[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchPredictions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/predict?steps=20`);
      const data = await response.json();
      if (data.success) {
        setPredictionData(data.predictions);
        if (data.feature_columns) {
          setAvailableFeatures(data.feature_columns);
          if (!data.feature_columns.includes(selectedParameter)){
            setSelectedParameter(data.feature_columns[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts`);
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/metrics`);
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const trainModel = async () => {
    setUploadStatus('Training model...');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/train`, { method: 'POST' });
      const data = await response.json();
      setUploadStatus(data.message || 'Request completed.');
      if (data.success) {
        await fetchPredictions(); 
      }
    } catch (error) {
      console.error('Error training model:', error);
      setUploadStatus('Failed to train model.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  // Initial and periodic data loading
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); 
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const getCurrentThreshold = () => {
    switch(selectedParameter) {
      case 'metal_temperature': return { upper: metalTempThreshold, lower: metalTempLowerThreshold };
      case 'solidification_time': return { upper: solidificationTimeThreshold, lower: solidificationTimeLowerThreshold };
      case 'tilting_angle': return { upper: tiltingAngleThreshold, lower: tiltingAngleLowerThreshold };
      case 'tilting_speed': return { upper: tiltingSpeedThreshold, lower: tiltingSpeedLowerThreshold };
      case 'top_die_temperature': return { upper: topDieTempThreshold, lower: topDieTempLowerThreshold };
      default: return { upper: 0, lower: 0 };
    }
  };

  const updateThreshold = (type, value) => {
    const numValue = parseInt(value, 10) || 0;
    switch(selectedParameter) {
      case 'metal_temperature': type === 'upper' ? setMetalTempThreshold(numValue) : setMetalTempLowerThreshold(numValue); break;
      case 'solidification_time': type === 'upper' ? setSolidificationTimeThreshold(numValue) : setSolidificationTimeLowerThreshold(numValue); break;
      case 'tilting_angle': type === 'upper' ? setTiltingAngleThreshold(numValue) : setTiltingAngleLowerThreshold(numValue); break;
      case 'tilting_speed': type === 'upper' ? setTiltingSpeedThreshold(numValue) : setTiltingSpeedLowerThreshold(numValue); break;
      case 'top_die_temperature': type === 'upper' ? setTopDieTempThreshold(numValue) : setTopDieTempLowerThreshold(numValue); break;
      default: break;
    }
  };

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };
  
  const selectedMachineMetrics = metrics && metrics[selectedMachine] ? metrics[selectedMachine] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white font-sans">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-blue-500/30 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  SparkMinda
                </h1>
                <p className="text-sm text-blue-300">LSTM-Powered Machine Monitor</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${isConnected ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm ${isConnected ? 'text-green-300' : 'text-red-300'}`}>
                  {isConnected ? 'API Connected' : 'API Disconnected'}
                </span>
              </div>
              <button
                onClick={trainModel}
                disabled={!isConnected || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Working...' : 'Force Retrain'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* File Upload Section */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 mb-8">
          <h3 className="text-xl font-semibold mb-4 text-blue-300 flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Data Management</span>
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload New Data File (.xlsx, .xls, .csv)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="flex-1 bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <button
                  onClick={uploadFile}
                  disabled={!selectedFile || isUploading || !isConnected}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {isUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Process Status
              </label>
              <div className="bg-slate-800/50 rounded-lg p-4 min-h-[80px] flex flex-col justify-center">
                {uploadStatus && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">{uploadStatus}</p>
                    {uploadProgress > 0 && (
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
                {!uploadStatus && (
                  <p className="text-sm text-gray-500">Select a file and click Upload.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Panel */}
        {/* CHANGE: Updated grid to use 3 columns on large screens and removed Utilization block */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-blue-300">Idle Violations</h3>
                <Clock className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-3xl font-bold text-red-400">{selectedMachineMetrics?.idle_time_violations ?? 'N/A'}</p>
                <p className="text-sm text-gray-400">{selectedMachine || 'No Machine Selected'}</p>
            </div>
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-blue-300">Temp Violations</h3>
                <Thermometer className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-yellow-400">{selectedMachineMetrics?.temperature_violations ?? 'N/A'}</p>
                <p className="text-sm text-gray-400">{selectedMachine || 'No Machine Selected'}</p>
            </div>
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-blue-300">Total Strokes</h3>
                <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400">{selectedMachineMetrics?.total_strokes ?? 'N/A'}</p>
                <p className="text-sm text-gray-400">{selectedMachine || 'No Machine Selected'}</p>
            </div>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-4 text-blue-300">Machine Selection</h3>
            <select 
              value={selectedMachine} 
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
            >
              {machines.length > 0 ? machines.map(machine => (
                <option key={machine} value={machine}>{machine}</option>
              )) : <option>No machines found</option>}
            </select>
          </div>

          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-4 text-blue-300">Parameter Selection</h3>
            <select 
              value={selectedParameter} 
              onChange={(e) => setSelectedParameter(e.target.value)}
              className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
            >
              {parameters
                .filter(p => availableFeatures.includes(p.value))
                .map(param => (
                  <option key={param.value} value={param.value}>{param.label}</option>
              ))}
              {availableFeatures.length === 0 && <option>No features available</option>}
            </select>
          </div>

          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-4 text-blue-300">Threshold Control</h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={getCurrentThreshold().lower}
                onChange={(e) => updateThreshold('lower', e.target.value)}
                className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                placeholder="Lower"
              />
              <input
                type="number"
                value={getCurrentThreshold().upper}
                onChange={(e) => updateThreshold('upper', e.target.value)}
                className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                placeholder="Upper"
              />
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 mb-8">
            <h3 className="text-xl font-semibold text-blue-300 mb-6">
              LSTM Predictions - {parameters.find(p => p.value === selectedParameter)?.label || 'Parameter'}
            </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey={selectedParameter} stroke="#3B82F6" strokeWidth={2} dot={false} name="Predicted Value"/>
                <Line type="monotone" dataKey={() => getCurrentThreshold().upper} stroke="#EF4444" strokeDasharray="5 5" dot={false} name="Upper Threshold" />
                <Line type="monotone" dataKey={() => getCurrentThreshold().lower} stroke="#FBBF24" strokeDasharray="5 5" dot={false} name="Lower Threshold" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Panel */}
        {alerts.length > 0 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
            <h3 className="text-xl font-semibold mb-6 text-red-300">Active Alerts</h3>
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div key={index} className={`bg-slate-800/50 rounded-lg p-4 flex items-center justify-between border-l-4 ${alert.severity === 'high' ? 'border-red-500' : 'border-yellow-500'}`}>
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className={`w-6 h-6 ${alert.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div>
                      <p className="font-medium text-white">
                        {alert.machine}: {alert.parameter} out of range
                      </p>
                      <p className="text-sm text-gray-400">
                        Current: <span className="font-semibold text-white">{alert.value}</span> | 
                        Threshold: <span className="font-semibold text-white">{alert.threshold}</span> | 
                        Time: <span className="font-semibold text-white">{alert.time}</span>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => dismissAlert(alert.id)}>
                    <X className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SparkMindaDashboard;