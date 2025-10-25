import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Multi-Stream Video Platform
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Stream your video or watch multiple streams simultaneously
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Link
            href="/stream"
            className="group bg-gray-800 hover:bg-gray-700 rounded-lg p-8 transition-all duration-200 hover:scale-105"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500 transition-colors">
                <span className="text-2xl">📹</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Start Streaming
              </h2>
              <p className="text-gray-300 mb-4">
                Share your video stream with others. Perfect for content
                creators, presenters, or anyone who wants to broadcast.
              </p>
              <div className="bg-blue-600 group-hover:bg-blue-500 text-white px-6 py-3 rounded-md font-medium transition-colors">
                Go Live →
              </div>
            </div>
          </Link>

          <Link
            href="/viewer"
            className="group bg-gray-800 hover:bg-gray-700 rounded-lg p-8 transition-all duration-200 hover:scale-105"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500 transition-colors">
                <span className="text-2xl">📺</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Watch Streams
              </h2>
              <p className="text-gray-300 mb-4">
                View all active streams in one place. See multiple video feeds
                simultaneously in a beautiful grid layout.
              </p>
              <div className="bg-green-600 group-hover:bg-green-500 text-white px-6 py-3 rounded-md font-medium transition-colors">
                Watch Now →
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-3">
              How it works
            </h3>
            <div className="space-y-2 text-gray-300 text-sm">
              <p>
                1. <strong>Streamers:</strong> Go to "Start Streaming" to
                broadcast your video
              </p>
              <p>
                2. <strong>Viewers:</strong> Go to "Watch Streams" to see all
                active streams
              </p>
              <p>
                3. <strong>Real-time:</strong> All streams are live and
                synchronized
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
