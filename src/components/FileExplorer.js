import React, { useState, useEffect } from 'react';
import axios, { isAxiosError } from 'axios';
import { FolderIcon, FileIcon, TrashIcon, UploadIcon, InfoIcon, FolderPlusIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/v1/filemanager';

const FileExplorer = () => {
  const [tree, setTree] = useState({});
  const [error, setError] = useState();
  const [newDirName, setNewDirName] = useState('');
  const [creatingDirPath, setCreatingDirPath] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tree`);
      setTree(response.data);
    } catch (err) {
      setError('Error fetching file tree');
    }
  };

  const handleDelete = async (path) => {
    try {
      await axios.delete(`${API_BASE_URL}/remove`, { params: { path } });
      fetchTree(); // Refresh the tree
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data || 'Error deleting item');
        return;
      }

      setError('Error deleting item');
    }
  };

  const handleUpload = async (event, path) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    try {
      await axios.post(`${API_BASE_URL}/upload`, formData);
      fetchTree(); // Refresh the tree
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data || 'Error uploading file');
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
      await axios.post(`${API_BASE_URL}/dir`, {
        path: `${parentPath}/${newDirName}`,
      });
      setNewDirName('');
      setCreatingDirPath(null);
      fetchTree(); // Refresh the tree
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data || 'Error creating directory');
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
      const response = await axios.get(`${API_BASE_URL}/download`, {
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

  const renderTree = (node, path = '', isLast = true, level = 0) => {
    if (!node || !node.info) return null;

    const isDirectory = node.info.isDirectory;
    const hasChildren = isDirectory && node.children && Object.keys(node.children).length > 0;
    const isExpanded = expandedFolders[node.info.path];

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
              <label className="ml-2 cursor-pointer">
                <UploadIcon className="text-green-500" size={16} />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleUpload(e, node.info.path)}
                />
              </label>

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
              <FileIcon className="mr-2 text-blue-500" size={20} />
              <span
                className="cursor-pointer hover:underline"
                onClick={() => handleDownload(node.info.path, node.info.name)}
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
        {renderTree(tree)}
      </div>
    </div>
  );
};

export default FileExplorer;