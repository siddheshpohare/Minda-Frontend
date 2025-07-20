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
  
  // Sample data - will be replaced with API data
  const [temperatureData, setTemperatureData] = useState([
    { time: '10:00', metal_temperature: 720, solidification_time: 45, tilting_angle: 25, tilting_speed: 20, top_die_temperature: 320, threshold: 80 },
    { time: '10:05', metal_temperature: 725, solidification_time: 48, tilting_angle: 28, tilting_speed: 22, top_die_temperature: 315, threshold: 80 },
    { time: '10:10', metal_temperature: 730, solidification_time: 42, tilting_angle: 30, tilting_speed: 18, top_die_temperature: 330, threshold: 80 },
    { time: '10:15', metal_temperature: 735, solidification_time: 50, tilting_angle: 26, tilting_speed: 25, top_die_temperature: 325, threshold: 80 },
    { time: '10:20', metal_temperature: 710, solidification_time: 46, tilting_angle: 29, tilting_speed: 21, top_die_temperature: 310, threshold: 80 },
    { time: '10:25', metal_temperature: 740, solidification_time: 44, tilting_angle: 32, tilting_speed: 19, top_die_temperature: 335, threshold: 80 },
    { time: '10:30', metal_temperature: 715, solidification_time: 47, tilting_angle: 27, tilting_speed: 23, top_die_temperature: 318, threshold: 80 },
  ]);

  // State for dropdowns
  const [selectedMachine, setSelectedMachine] = useState('Machine-001');
  const [selectedParameter, setSelectedParameter] = useState('metal_temperature');
  const [metalTempThreshold, setMetalTempThreshold] = useState(755);
  const [solidificationTimeThreshold, setSolidificationTimeThreshold] = useState(50);
  const [tiltingAngleThreshold, setTiltingAngleThreshold] = useState(35);
  const [tiltingSpeedThreshold, setTiltingSpeedThreshold] = useState(25);
  const [topDieTempThreshold, setTopDieTempThreshold] = useState(370);

  // Machine options
  const [machines, setMachines] = useState([
    'Machine-001', 'Machine-002', 'Machine-003', 'Machine-004', 'Machine-005'
  ]);

  // Parameter options
  const parameters = [
    { value: 'metal_temperature', label: 'Metal Temperature (°C)', icon: Thermometer },
    { value: 'solidification_time', label: 'Solidification Time (min)', icon: Clock },
    { value: 'tilting_angle', label: 'Tilting Angle (°)', icon: RotateCcw },
    { value: 'tilting_speed', label: 'Tilting Speed (rpm)', icon: Gauge },
    { value: 'top_die_temperature', label: 'Top Die Temperature (°C)', icon: Zap }
  ];

  // Alerts state
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [currentData, setCurrentData] = useState({});
  const [availableFeatures, setAvailableFeatures] = useState([]);

  // File upload handler
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setUploadStatus('');
      } else {
        setUploadStatus('Please select a valid Excel file (.xlsx or .xls)');
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
    setUploadStatus('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

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
        setUploadStatus('File uploaded successfully! Training model...');
        
        // Auto-train model after successful upload
        await trainModel();
        
        // Refresh all data
        await fetchMachines();
        await fetchPredictions();
        await fetchAlerts();
        await fetchMetrics();
        await fetchCurrentData();
        
        setUploadStatus('Upload complete! Model trained and data refreshed.');
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
      }, 3000);
    }
  };

  // API Functions
  const checkAPIHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      setIsConnected(data.status === 'healthy');
      if (data.feature_columns) {
        setAvailableFeatures(data.feature_columns);
      }
      return data.status === 'healthy';
    } catch (error) {
      console.error('API health check failed:', error);
      setIsConnected(false);
      return false;
    }
  };

  const fetchMachines = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/machines`);
      const data = await response.json();
      
      if (data.success) {
        setMachines(data.machines);
        if (data.machines.length > 0 && !data.machines.includes(selectedMachine)) {
          setSelectedMachine(data.machines[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  }, [API_BASE_URL, selectedMachine]);

  const fetchPredictions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/predict?steps=20`);
      const data = await response.json();
      
      if (data.success) {
        setTemperatureData(data.predictions);
        if (data.feature_columns) {
          setAvailableFeatures(data.feature_columns);
        }
      } else {
        console.error('Failed to fetch predictions:', data.message);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.alerts);
      } else {
        console.error('Failed to fetch alerts:', data.message);
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
      } else {
        console.error('Failed to fetch metrics:', data.message);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchCurrentData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/current-data`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentData(data.data);
      } else {
        console.error('Failed to fetch current data:', data.message);
      }
    } catch (error) {
      console.error('Error fetching current data:', error);
    }
  };

  const trainModel = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setUploadStatus('Model trained successfully!');
        await fetchPredictions(); // Refresh predictions after training
      } else {
        setUploadStatus(`Training failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error training model:', error);
      setUploadStatus('Failed to train model. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // UseEffect for initial data loading and periodic updates
  useEffect(() => {
    const initializeApp = async () => {
      const isHealthy = await checkAPIHealth();
      if (isHealthy) {
        await fetchMachines();
        await fetchPredictions();
        await fetchAlerts();
        await fetchMetrics();
        await fetchCurrentData();
      }
    };

    initializeApp();

    // Set up periodic updates
    const interval = setInterval(() => {
      if (isConnected) {
        fetchAlerts();
        fetchMetrics();
        fetchCurrentData();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, fetchMachines]);

  // Current parameter data based on selection
  const getCurrentData = () => {
    return temperatureData;
  };

  const getCurrentThreshold = () => {
    switch(selectedParameter) {
      case 'metal_temperature': return metalTempThreshold;
      case 'solidification_time': return solidificationTimeThreshold;
      case 'tilting_angle': return tiltingAngleThreshold;
      case 'tilting_speed': return tiltingSpeedThreshold;
      case 'top_die_temperature': return topDieTempThreshold;
      default: return metalTempThreshold;
    }
  };

  const updateThreshold = (value) => {
    switch(selectedParameter) {
      case 'metal_temperature': setMetalTempThreshold(value); break;
      case 'solidification_time': setSolidificationTimeThreshold(value); break;
      case 'tilting_angle': setTiltingAngleThreshold(value); break;
      case 'tilting_speed': setTiltingSpeedThreshold(value); break;
      case 'top_die_temperature': setTopDieTempThreshold(value); break;
      default: break;
    }
  };

  // Check for threshold violations
  const checkAlerts = () => {
    const currentData = getCurrentData();
    if (currentData.length === 0) return false;
    
    const latestReading = currentData[currentData.length - 1];
    const parameterValue = latestReading[selectedParameter];
    
    return parameterValue > getCurrentThreshold();
  };

  // Dismiss alert
  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-blue-500/30">
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
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-400" />
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400">API Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-400" />
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-400">API Disconnected</span>
                  </>
                )}
              </div>
              <button
                onClick={trainModel}
                disabled={!isConnected || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Training...' : 'Train Model'}</span>
              </button>
              <button
                onClick={fetchPredictions}
                disabled={!isConnected || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Refresh Data</span>
              </button>
              <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* File Upload Section */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 mb-8">
          <h3 className="text-xl font-semibold mb-4 text-blue-300 flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Data Upload</span>
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Excel File (.xlsx, .xls)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="flex-1 bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <button
                  onClick={uploadFile}
                  disabled={!selectedFile || isUploading || !isConnected}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload & Train</span>
                    </>
                  )}
                </button>
              </div>
              
              {selectedFile && (
                <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-300">Selected: {selectedFile.name}</span>
                    <span className="text-xs text-gray-400">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload Status
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
                  <p className="text-sm text-gray-500">No file uploaded yet</p>
                )}
              </div>
            </div>
          </div>
          
          {availableFeatures.length > 0 && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <h4 className="text-sm font-medium text-green-300 mb-2">Available Features in Model:</h4>
              <div className="flex flex-wrap gap-2">
                {availableFeatures.map((feature, index) => (
                  <span key={index} className="px-2 py-1 bg-green-600/20 text-green-300 rounded text-xs">
                    {feature.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metrics Panel */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {Object.entries(metrics).slice(0, 1).map(([machineName, machineMetrics]) => (
              machineMetrics && (
                <React.Fragment key={machineName}>
                  <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-blue-300">Idle Time Violations</h3>
                      <Clock className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-red-400">{machineMetrics.idle_time_violations || 0}</p>
                    <p className="text-sm text-gray-400">Idle &gt; 10 mins</p>
                  </div>
                  <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-blue-300">Temp Violations</h3>
                      <Thermometer className="w-5 h-5 text-yellow-400" />
                    </div>
                    <p className="text-3xl font-bold text-yellow-400">{machineMetrics.temperature_violations || 0}</p>
                    <p className="text-sm text-gray-400">Out of range</p>
                  </div>
                  <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-blue-300">Total Strokes</h3>
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-green-400">{machineMetrics.total_strokes || 0}</p>
                    <p className="text-sm text-gray-400">Production count</p>
                  </div>
                  <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-blue-300">Utilization</h3>
                      <Gauge className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-purple-400">{machineMetrics.machine_utilization || 0}%</p>
                    <p className="text-sm text-gray-400">Machine efficiency</p>
                  </div>
                </React.Fragment>
              )
            ))}
          </div>
        )}

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Machine Selection */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-4 text-blue-300">Machine Selection</h3>
            <select 
              value={selectedMachine} 
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition-colors"
            >
              {machines.map(machine => (
                <option key={machine} value={machine}>{machine}</option>
              ))}
            </select>
          </div>

          {/* Parameter Selection */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-4 text-blue-300">Parameter</h3>
            <select 
              value={selectedParameter} 
              onChange={(e) => setSelectedParameter(e.target.value)}
              className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition-colors"
            >
              {parameters.filter(param => availableFeatures.length === 0 || availableFeatures.includes(param.value)).map(param => (
                <option key={param.value} value={param.value}>{param.label}</option>
              ))}
            </select>
          </div>

          {/* Threshold Setting */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-4 text-blue-300">Threshold</h3>
            <input
              type="number"
              value={getCurrentThreshold()}
              onChange={(e) => updateThreshold(parseInt(e.target.value))}
              className="w-full bg-slate-800/50 border border-blue-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition-colors"
              placeholder="Set threshold"
            />
          </div>

          {/* Current Status */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold mb-4 text-blue-300">Current Status</h3>
            <div className="flex items-center space-x-2">
              {checkAlerts() ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">Alert</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                  <span className="text-green-400">Normal</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Data Display */}
        {currentData[selectedMachine] && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 mb-8">
            <h3 className="text-xl font-semibold mb-6 text-blue-300">Real-time Data - {selectedMachine}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {availableFeatures.map((feature, index) => {
                const parameterInfo = parameters.find(p => p.value === feature);
                const IconComponent = parameterInfo?.icon || Thermometer;
                const value = currentData[selectedMachine][feature] || 0;
                
                return (
                  <div key={feature} className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <IconComponent className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-300">
                        {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">
                      {typeof value === 'number' ? value.toFixed(1) : value}
                      {feature.includes('temperature') ? '°C' : 
                       feature.includes('time') ? 'm' : 
                       feature.includes('angle') ? '°' : 
                       feature.includes('speed') ? ' rpm' : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Chart */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-blue-300">
              LSTM Predictions - {parameters.find(p => p.value === selectedParameter)?.label || 'Parameter'}
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-300">Predicted Values</span>
              <div className="w-3 h-3 bg-red-500 rounded-full ml-4"></div>
              <span className="text-sm text-gray-300">Threshold</span>
            </div>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getCurrentData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone"
                  dataKey={selectedParameter}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  name={parameters.find(p => p.value === selectedParameter)?.label}
                />
                <Line 
                  type="monotone"
                  dataKey={() => getCurrentThreshold()}
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  dot={false}
                  name="Threshold"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Panel */}
        {alerts.length > 0 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 mb-8">
            <h3 className="text-xl font-semibold mb-6 text-blue-300">Active Alerts</h3>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-400">{alert.message}</p>
                      <p className="text-xs text-gray-400">{alert.time}</p>
                    </div>
                  </div>
                  <button onClick={() => dismissAlert(alert.id)}>
                    <X className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
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
