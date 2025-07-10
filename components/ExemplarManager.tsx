'use client';

import React, { useState, useEffect } from 'react';
import { enhancedMemoryManager, ExemplarConversation } from '../utils/agent/memory';
import { Pencil, Trash2, Tag, Clock } from 'lucide-react';

interface ExemplarManagerProps {
  className?: string;
  onExemplarEdit?: (exemplar: ExemplarConversation) => void;
  onExemplarDelete?: (exemplarId: string) => void;
}

interface EditExemplarData {
  title: string;
  description: string;
  tags: string[];
}

export default function ExemplarManager({
  className = '',
  onExemplarEdit,
  onExemplarDelete
}: ExemplarManagerProps) {
  const [exemplars, setExemplars] = useState<ExemplarConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all');
  const [editingExemplar, setEditingExemplar] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditExemplarData>({ title: '', description: '', tags: [] });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadExemplars();
  }, []);

  const loadExemplars = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const exemplars = await enhancedMemoryManager.getExemplars();
      setExemplars(exemplars);
    } catch (err) {
      console.error('Error loading exemplars:', err);
      setError('Failed to load exemplars. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (exemplar: ExemplarConversation) => {
    setEditingExemplar(exemplar.id);
    setEditData({
      title: exemplar.title,
      description: exemplar.description || '',
      tags: [...exemplar.tags]
    });
  };

  const handleSaveEdit = async () => {
    if (!editingExemplar) return;

    try {
      await enhancedMemoryManager.updateExemplar(editingExemplar, {
        title: editData.title,
        description: editData.description,
        tags: editData.tags
      });

      // Update local state
      setExemplars(prev => prev.map(exemplar => 
        exemplar.id === editingExemplar 
          ? { ...exemplar, title: editData.title, description: editData.description, tags: editData.tags }
          : exemplar
      ));

      setEditingExemplar(null);
      setEditData({ title: '', description: '', tags: [] });
      onExemplarEdit?.(exemplars.find(e => e.id === editingExemplar)!);
    } catch (err) {
      console.error('Error updating exemplar:', err);
      setError('Failed to update exemplar. Please try again.');
    }
  };

  const handleDelete = async (exemplarId: string) => {
    if (!confirm('Are you sure you want to delete this exemplar?')) return;

    try {
      await enhancedMemoryManager.deleteExemplar(exemplarId);

      // Remove from local state
      setExemplars(prev => prev.filter(exemplar => exemplar.id !== exemplarId));
      onExemplarDelete?.(exemplarId);
    } catch (err) {
      console.error('Error deleting exemplar:', err);
      setError('Failed to delete exemplar. Please try again.');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !editData.tags.includes(newTag.trim())) {
      setEditData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const filteredExemplars = exemplars.filter(exemplar => 
    filterType === 'all' || exemplar.exemplarType === filterType
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-gray-500">Loading exemplars...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Exemplar Conversations</h3>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'positive' | 'negative')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {filteredExemplars.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Tag className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p>No exemplar conversations found.</p>
          <p className="text-sm">Mark conversations as helpful or not helpful to create exemplars.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExemplars.map((exemplar) => (
            <div
              key={exemplar.id}
              className={`border rounded-lg p-4 transition-all duration-200 ${
                exemplar.exemplarType === 'positive'
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              {editingExemplar === exemplar.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Exemplar title"
                  />
                  
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description (optional)"
                    rows={2}
                  />

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add tag"
                      />
                      <button
                        onClick={addTag}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    
                    {editData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {editData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingExemplar(null)}
                      className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{exemplar.title}</h4>
                      {exemplar.description && (
                        <p className="text-sm text-gray-600 mb-2">{exemplar.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <span className={`px-2 py-1 rounded-full ${
                          exemplar.exemplarType === 'positive'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {exemplar.exemplarType === 'positive' ? 'Positive' : 'Negative'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(exemplar.createdAt)}
                        </span>
                        <span>Used {exemplar.usageCount} times</span>
                      </div>

                      {exemplar.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {exemplar.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleEdit(exemplar)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit exemplar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(exemplar.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete exemplar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 