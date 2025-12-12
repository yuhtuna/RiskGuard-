import React, { useEffect } from 'react';
import HomePage from './pages/home/HomePage';

const App: React.FC = () => {
    useEffect(() => {
        // Prevent unhandled promise rejections from causing page refresh
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            console.error('Unhandled promise rejection:', event.reason);
            event.preventDefault();
        };

        // Prevent uncaught errors from causing page refresh
        const handleError = (event: ErrorEvent) => {
            console.error('Uncaught error:', event.error);
            event.preventDefault();
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleError);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleError);
        };
    }, []);

    return (
        <div className="bg-gray-900 text-gray-200">
            <HomePage />
        </div>
    );
};

export default App;
