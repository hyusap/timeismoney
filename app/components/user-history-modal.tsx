"use client";

import { useState } from "react";

interface SearchResult {
  summary: string;
  timestamp: number;
  roomName: string;
  chunkDuration: number;
  taskCompleted: boolean;
  mainTaskPrompt: string;
  frameCount: number;
  relevanceScore: number;
}

interface UserHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export function UserHistoryModal({
  isOpen,
  onClose,
  walletAddress,
}: UserHistoryModalProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setIsSearching(true);
    setError("");
    setResults([]);
    setAnalysis("");

    try {
      const response = await fetch("/api/user-history-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          query: query.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to search user history");
      }

      const data = await response.json();
      setResults(data.results || []);
      setAnalysis(data.analysis || "No analysis available");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold font-mono">USER HISTORY SEARCH</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Input */}
          <div className="mb-6">
            <label className="block text-sm font-mono text-gray-700 mb-2">
              QUERY (e.g., "Are they an idiot?", "What tasks have they completed?")
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter your search query..."
                className="flex-1 px-4 py-3 border-2 border-red-300 rounded font-mono text-sm focus:outline-none focus:border-red-500 bg-white text-gray-900 placeholder:text-gray-400"
                disabled={isSearching}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-8 py-3 bg-red-600 text-white font-mono font-bold rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSearching ? "SEARCHING..." : "SEARCH"}
              </button>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="mb-6 p-3 bg-gray-100 rounded border border-gray-300">
            <div className="text-xs font-mono text-gray-600">TARGET WALLET</div>
            <div className="text-sm font-mono text-gray-900 break-all">
              {walletAddress}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 rounded">
              <div className="text-sm font-mono text-red-700">ERROR: {error}</div>
            </div>
          )}

          {/* Analysis */}
          {analysis && (
            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-500 rounded">
              <div className="text-xs font-mono text-yellow-800 mb-2 font-bold">
                AI ANALYSIS
              </div>
              <div className="text-sm font-mono text-gray-900">{analysis}</div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div>
              <div className="text-sm font-mono text-gray-700 mb-3 font-bold">
                FOUND {results.length} RELEVANT ACTIVITIES
              </div>
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 border border-gray-300 rounded"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs font-mono text-gray-600">
                        {new Date(result.timestamp).toLocaleString()}
                      </div>
                      <div
                        className={`text-xs font-mono px-2 py-1 rounded ${
                          result.taskCompleted
                            ? "bg-green-200 text-green-800"
                            : "bg-red-200 text-red-800"
                        }`}
                      >
                        {result.taskCompleted ? "COMPLETED" : "INCOMPLETE"}
                      </div>
                    </div>
                    <div className="text-sm font-mono text-gray-900 mb-2">
                      {result.summary}
                    </div>
                    {result.mainTaskPrompt && (
                      <div className="text-xs font-mono text-gray-600">
                        Task: {result.mainTaskPrompt}
                      </div>
                    )}
                    <div className="text-xs font-mono text-gray-500 mt-1">
                      Room: {result.roomName} | Duration: {result.chunkDuration}m
                      | Relevance: {(result.relevanceScore * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!isSearching && results.length === 0 && analysis === "" && !error && query && (
            <div className="text-center py-8">
              <div className="text-sm font-mono text-gray-500">
                No results found
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-300">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white font-mono font-bold rounded hover:bg-gray-700"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
