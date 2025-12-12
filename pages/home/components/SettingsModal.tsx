import React, { useState, useEffect } from 'react';
import { Settings, Save, X, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, username }) => {
    const [raindropToken, setRaindropToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (isOpen && username) {
            // Fetch existing token
            fetch(`/api/user/settings?username=${username}`)
                .then(res => res.json())
                .then(data => {
                    if (data.raindrop_token) setRaindropToken(data.raindrop_token);
                })
                .catch(console.error);
        }
    }, [isOpen, username]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, raindrop_token: raindropToken })
            });
            
            if (res.ok) {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden transform transition-all">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">User Settings</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                            Raindrop.io Test Token
                        </label>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={raindropToken}
                                onChange={(e) => setRaindropToken(e.target.value)}
                                placeholder="Enter your Raindrop Test Token"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            Get token from <a href="https://app.raindrop.io/settings/integrations" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Raindrop Developer Settings</a>
                        </p>
                    </div>

                    {/* Status Message */}
                    {status === 'success' && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center justify-center">
                            Settings saved successfully!
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center justify-center">
                            Failed to save settings.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;