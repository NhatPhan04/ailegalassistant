import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faTimes, faCheck, faExclamationCircle, faFileAlt } from '@fortawesome/free-solid-svg-icons';

export default function UploadView() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles) {
      setFiles(prev => [...prev, ...Array.from(droppedFiles)]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Vui lòng chọn file trước');
      return;
    }

    setUploading(true);
    setUploadStatus('loading');

    try {
      // Giả lập gửi API
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setUploadStatus('success');
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="upload-container-new">
      <div className="upload-card">
        <h1 className="upload-title">Upload File</h1>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="icon-wrapper">
            <FontAwesomeIcon icon={faCloudUploadAlt} />
          </div>
          <p className="drop-text-main">Kéo thả file tại đây</p>
          <p className="drop-text-sub">hoặc nhấp để chọn file</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            hidden
            accept="*/*"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="file-list-section">
            <h3 className="list-title">
              Đã chọn ({files.length} file)
            </h3>
            <div className="file-items-wrapper">
              {files.map((file, index) => (
                <div key={index} className="file-row">
                  <div className="file-row-icon">
                      <FontAwesomeIcon icon={faFileAlt} />
                  </div>
                  <div className="file-info">
                    <p className="file-name" title={file.name}>{file.name}</p>
                    <p className="file-size">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="remove-btn"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className={`upload-submit-btn ${uploading || files.length === 0 ? 'disabled' : ''}`}
        >
          {uploading ? 'Đang tải lên...' : 'Tải lên ngay'}
        </button>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="status-msg success">
            <FontAwesomeIcon icon={faCheck} />
            <span>Tải lên thành công!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="status-msg error">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>Lỗi khi tải lên</span>
          </div>
        )}
      </div>
    </div>
  );
}