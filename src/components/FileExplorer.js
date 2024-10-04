import axios, { isAxiosError } from 'axios';
import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon, FolderPlusIcon, HardDriveUpload, ImageIcon, InfoIcon, TrashIcon, UploadIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:8080/v1/filemanager';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Authorization: `Bearer fc8211d9819f87e94ec78dc8ad728c5c00986c36a37ea3235fcba97f66824cd7_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJha3NlcyI6IkFETUlOIiwiY3JlYXRlZCI6MTcyODA1NzcwMDA3MywiZXhwIjoxNzI4NjYyNTAwLCJpbml0aWFsX2RldmljZV9kaXNwbGF5X25hbWUiOiJGYWRpbCIsImlzX3N1cGVyYWRtaW4iOnRydWUsImtlcG9saXNpYW5fbGV2ZWwiOiJNQUJFUyIsImtvZGVfa29yd2lsIjoiIiwia29kZV9zYXRrZXIiOiIiLCJuYW1lIjoiRmFkaWwiLCJucnAiOiIwMTA2MTk5NyIsInJvbGVzIjpudWxsLCJzcHBtIjoiIiwic3ViIjoic3VwZXJhZG1pbiIsInVzZXJfbmFtZSI6InN1cGVyYWRtaW4iLCJ1c2VyX3V1aWQiOiIzOTA0ZjM3Yy03MDYyLTQzOGMtODZhOS1hNjdhNmRkMTUyZTUifQ.1O_wXTFQpPuBkQiIcXFMZM_HyMZkoR6W4_CTyGnDA3I`,
    Dates: 1728057699916
  },
});

const ImagePopup = ({ imageSrc, position }) => {
  if (!imageSrc) return null;

  return (
    <div
      className="absolute z-50 bg-white border-2 border-gray-300 rounded shadow-lg p-2"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y}px`,
        maxWidth: '300px',
        maxHeight: '300px'
      }}
    >
      <img src={imageSrc} alt="Preview" className="max-w-full max-h-full object-contain" />
    </div>
  );
};

const FileExplorer = () => {
  const [tree, setTree] = useState({});
  const [error, setError] = useState();
  const [newDirName, setNewDirName] = useState('');
  const [creatingDirPath, setCreatingDirPath] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [imagePopup, setImagePopup] = useState({ show: false, src: '', position: { x: 0, y: 0 } });

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const response = await API.get(`${API_BASE_URL}/tree`);
      setTree(response.data);
    } catch (err) {
      setError('Error fetching file tree');
    }
  };

  const handleDelete = async (path) => {
    try {
      await API.delete(`${API_BASE_URL}/remove`, { params: { path } });
      fetchTree(); // Refresh the tree
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data.debug.error_message || 'Error deleting item');
        return;
      }

      setError('Error deleting item');
    }
  };

  const handleUpload = async (event, path) => {
    const files = event.target.files;
    if (!files) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('path', path);

    try {
      await API.post(`${API_BASE_URL}/upload`, formData);
      fetchTree(); // Refresh the tree
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data.debug.error_message || 'Error uploading file');
        return;
      }

      setError('Error uploading file');
    }
  };

  const handleCreateDir = async (parentPath) => {
    if (!newDirName) {
      setError('Directory name cannot be empty');
      return;
    }
    try {
      await API.post(`${API_BASE_URL}/dir`, {
        path: `${parentPath}/${newDirName}`,
      });
      setNewDirName('');
      setCreatingDirPath(null);
      fetchTree(); // Refresh the tree
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data.debug.error_message || 'Error creating directory');
        return;
      }

      setError('Error creating directory');
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDownload = async (path, filename) => {
    try {
      const response = await API.get(`${API_BASE_URL}/download`, {
        params: { path },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Error downloading file');
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const handleImageHover = async (show, path, event) => {
    if (show && isImageFile(path)) {
      try {
        const response = await API.get(`${API_BASE_URL}/download`, {
          params: { path },
          responseType: 'blob',
        });
        const imageSrc = URL.createObjectURL(response.data);
        setImagePopup({
          show: true,
          src: imageSrc,
          position: { x: event.clientX, y: event.clientY }
        });
      } catch (err) {
        console.error('Error loading image preview:', err);
      }
    } else {
      setImagePopup({ show: false, src: '', position: { x: 0, y: 0 } });
    }
  };

  const handleChunkedUpload = async (event, path) => {
    const file = event.target.files[0];
    if (!file) return;

    const chunkSize = 4 * 1024 * 1024; // 4MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
      const start = (chunkNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk, file.name);
      formData.append('chunk_number', chunkNumber);
      formData.append('total_chunks', totalChunks);
      formData.append('filename', file.name);
      formData.append('path', path);

      try {
        await API.post(`${API_BASE_URL}/upload-chunk`, formData);
      } catch (err) {
        if (isAxiosError(err)) {
          setError(err.response?.data.debug.error_message || 'Error uploading file chunk');
        } else {
          setError('Error uploading file chunk');
        }
        return; // Stop the upload process if there's an error
      }
    }

    fetchTree(); // Refresh the tree after all uploads are complete
  };

  const renderTree = (node, path = '', isLast = true, level = 0) => {
    if (!node || !node.info) return null;

    const isDirectory = node.info.isDirectory;
    const hasChildren = isDirectory && node.children && Object.keys(node.children).length > 0;
    const isExpanded = expandedFolders[node.info.path];
    const isImage = isImageFile(node.info.name);

    return (
      <div key={node.info.path} className={`ml-4 ${level > 0 ? 'relative' : ''}`}>
        {level > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 border-l-2 border-gray-300"
            style={{ left: '-16px', height: isLast ? '16px' : '100%' }}
          />
        )}
        <div className="flex items-center relative">
          {level > 0 && (
            <div
              className="absolute border-t-2 border-gray-300"
              style={{ left: '-16px', width: '16px', top: '10px' }}
            />
          )}
          {isDirectory && hasChildren && (
            <span
              className="cursor-pointer mr-1"
              onClick={() => toggleFolder(node.info.path)}
            >
              {isExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
            </span>
          )}
          {isDirectory ? (
            <>
              <FolderIcon className="mr-2 text-yellow-500" size={20} />
              <span
                className="font-semibold cursor-pointer"
                onClick={() => toggleFolder(node.info.path)}
              >
                {node.info.name}
              </span>
              <div className="file-actions flex items-center gap-1 ml-2">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleUpload(e, node.info.path)}
                  style={{ display: 'none' }}
                  id={`fileInput-${node.info.path}`}
                />
                <label htmlFor={`fileInput-${node.info.path}`}>
                  <UploadIcon className="text-green-500 cursor-pointer" size={16} />
                </label>
                <input
                  type="file"
                  onChange={(e) => handleChunkedUpload(e, node.info.path)}
                  style={{ display: 'none' }}
                  id={`chunkedFileInput-${node.info.path}`}
                />
                <label htmlFor={`chunkedFileInput-${node.info.path}`}>
                  <HardDriveUpload className="text-green-500 cursor-pointer" size={16} />
                </label>
              </div>
              {creatingDirPath === node.info.path ? (
                <div className="ml-6 mt-2 flex items-center gap-1">
                  <input
                    type="text"
                    value={newDirName}
                    onChange={(e) => setNewDirName(e.target.value)}
                    placeholder="New folder name"
                    className="p-1 mr-2 border-b-2 border-gray-300"
                  />
                  <button
                    onClick={() => {
                      setCreatingDirPath(null);
                      setNewDirName('');
                    }}
                    className="bg-red-700 text-white px-1.5 py-1 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateDir(node.info.path)}
                    className="bg-green-500 text-white px-1.5 py-1 rounded"
                  >
                    Create
                  </button>
                </div>
              ) :
                <FolderPlusIcon
                  className="ml-2 text-blue-500 cursor-pointer"
                  size={16}
                  onClick={() => setCreatingDirPath(node.info.path)}
                />
              }
            </>
          ) : (
            <>
              {isImage ? <ImageIcon className="mr-2 text-purple-500" size={20} /> : <FileIcon className="mr-2 text-blue-500" size={20} />}
              <span
                className="cursor-pointer hover:underline"
                onClick={() => handleDownload(node.info.path, node.info.name)}
                onMouseEnter={(e) => handleImageHover(true, node.info.path, e)}
                onMouseLeave={() => handleImageHover(false)}
              >
                {node.info.name}
              </span>
            </>
          )}
          <TrashIcon
            className="ml-2 text-red-500 cursor-pointer"
            size={16}
            onClick={() => handleDelete(node.info.path)}
          />
          <InfoIcon className="ml-2 text-gray-500" size={16} />
          <div className="text-sm text-gray-600 ml-1">
            Size: {formatSize(node.info.size)} | Last Modified: {formatDate(node.info.lastModified)}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4 mt-1">
            {Object.entries(node.children).map(([key, value], index, array) =>
              renderTree(value, `${path}/${key}`, index === array.length - 1, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">File Explorer</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="border p-4 rounded">
        {renderTree(tree.data)}
      </div>

      {imagePopup.show && <ImagePopup imageSrc={imagePopup.src} position={imagePopup.position} />}
    </div>
  );
};

export default FileExplorer;