import React, { useState, useCallback } from 'react';
import { AppStatus } from './types';
import { generateTidyRoomImage } from './services/geminiService';

// --- Helper Components & Icons (defined outside the main component) ---

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.5 21.75l-.398-1.188a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.188-.398a2.25 2.25 0 001.423-1.423L16.5 15.75l.398 1.188a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.188.398a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
);

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Main App Component ---

interface AppState {
  status: AppStatus;
  imageFile: File | null;
  imageDataUrl: string | null;
  generatedImageUrl: string | null;
  error: string | null;
}

const initialState: AppState = {
  status: AppStatus.IDLE,
  imageFile: null,
  imageDataUrl: null,
  generatedImageUrl: null,
  error: null,
};

export default function App() {
  const [state, setState] = useState<AppState>(initialState);

  const handleReset = useCallback(() => {
    setState(initialState);
  }, []);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState({
          ...initialState,
          status: AppStatus.IMAGE_SELECTED,
          imageFile: file,
          imageDataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyzeClick = useCallback(async () => {
    if (!state.imageFile) return;

    setState(prevState => ({ ...prevState, status: AppStatus.ANALYZING, error: null }));

    try {
      const reader = new FileReader();
      reader.readAsDataURL(state.imageFile);
      reader.onload = async (e) => {
          const base64String = (e.target?.result as string).split(',')[1];
          if (base64String && state.imageFile) {
            const generatedImageBase64 = await generateTidyRoomImage(base64String, state.imageFile.type);
            const generatedImageUrl = `data:image/png;base64,${generatedImageBase64}`;
            setState(prevState => ({ ...prevState, status: AppStatus.SUCCESS, generatedImageUrl }));
          } else {
             throw new Error("Could not read file for analysis.");
          }
      };
      reader.onerror = (error) => {
          console.error("FileReader error:", error);
          setState(prevState => ({ ...prevState, status: AppStatus.ERROR, error: 'Failed to read image file.' }));
      };
      
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setState(prevState => ({ ...prevState, status: AppStatus.ERROR, error: errorMessage }));
    }
  }, [state.imageFile]);

  const handleSaveImage = useCallback(() => {
    if (!state.generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = state.generatedImageUrl;
    link.download = 'tidy-room.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state.generatedImageUrl]);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            AI Room Tidier
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400">
            Upload a photo of your messy room and watch AI magically tidy it up!
          </p>
        </header>

        <main className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Left Column: Image Upload & Preview */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <h2 className="text-2xl font-bold text-center text-gray-700 dark:text-gray-200">Before</h2>
              {state.status === AppStatus.IDLE && (
                <div className="w-full h-96 border-3 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col justify-center items-center text-center p-6 relative hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 bg-gray-50 dark:bg-gray-700/50">
                  <UploadIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Upload a Photo</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Click to browse or drag and drop your image here</p>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              )}

              {state.imageDataUrl && (
                <div className="w-full">
                   <img src={state.imageDataUrl} alt="Room preview" className="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-lg" />
                </div>
              )}
               <div className="w-full flex justify-center space-x-4 pt-4">
                {(state.status === AppStatus.IMAGE_SELECTED || state.status === AppStatus.ANALYZING || state.status === AppStatus.ERROR) && (
                  <button onClick={handleAnalyzeClick} disabled={state.status === AppStatus.ANALYZING} className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105 duration-300 shadow-lg">
                    {state.status === AppStatus.ANALYZING ? <><Spinner /> Tidying...</> : <><SparklesIcon className="w-5 h-5 mr-2" /> Tidy Up My Room</>}
                  </button>
                )}
                
                {state.status === AppStatus.SUCCESS && (
                    <button onClick={handleSaveImage} className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-transform transform hover:scale-105 duration-300 shadow-lg">
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Save Photo
                    </button>
                )}

                {state.status !== AppStatus.IDLE && (
                  <button onClick={handleReset} className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-transform transform hover:scale-105 duration-300 shadow-lg">
                   Start Over
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Generated Image */}
            <div className="flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-center text-gray-700 dark:text-gray-200">After</h2>
              {state.status === AppStatus.ANALYZING && (
                 <div className="w-full h-96 flex flex-col text-center justify-center items-center p-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                   <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                   <h3 className="text-xl font-semibold">Tidying your space...</h3>
                   <p className="text-gray-500 dark:text-gray-400">Our AI is working its magic!</p>
                 </div>
              )}
              {state.status === AppStatus.SUCCESS && state.generatedImageUrl && (
                <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg h-full">
                    <img src={state.generatedImageUrl} alt="Tidy room" className="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-lg" />
                </div>
              )}
              {state.status === AppStatus.ERROR && (
                <div className="w-full h-96 flex flex-col justify-center items-center bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md" role="alert">
                  <p className="font-bold">Oops! Something went wrong.</p>
                  <p>{state.error}</p>
                </div>
              )}
               {(state.status === AppStatus.IDLE || state.status === AppStatus.IMAGE_SELECTED) && (
                <div className="w-full h-96 text-center p-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex flex-col items-center justify-center h-full">
                    <SparklesIcon className="w-16 h-16 text-blue-500 dark:text-blue-400 mb-4" />
                    <h3 className="text-2xl font-bold">Your tidy room will appear here</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Upload a photo to see the transformation.</p>
                </div>
               )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
