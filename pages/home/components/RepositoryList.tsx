import React, { useState } from 'react';
import { Search, GitBranch, Lock, Globe } from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  updated_at: string;
}

interface RepositoryListProps {
  repos: Repository[];
  onSelect: (repo: Repository) => void;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({ repos, onSelect }) => {
  const [search, setSearch] = useState('');

  const filteredRepos = repos.filter(repo =>
    repo.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700 shadow-xl flex flex-col h-[600px]">
      <h2 className="text-xl font-bold text-white mb-4">Select a Repository</h2>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          placeholder="Filter repositories..."
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
        {filteredRepos.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No repositories found.
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelect(repo)}
              className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-blue-500/50 rounded-lg transition-all group text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                  {repo.private ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                    {repo.full_name}
                  </h3>
                  <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center">
                      <GitBranch className="w-3 h-3 mr-1" />
                      {repo.default_branch}
                    </span>
                    <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
