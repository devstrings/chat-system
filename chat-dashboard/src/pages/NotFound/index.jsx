import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center">
            <h1 className="text-5xl font-bold text-gray-800">404</h1>
            <p className="text-gray-600 mt-2">Page not found</p>

            <Link
                to="/"
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                Go Home
            </Link>
        </div>
    );
}