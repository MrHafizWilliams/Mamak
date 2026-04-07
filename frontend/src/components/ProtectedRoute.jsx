import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  
  // If there is no token, redirect them to the Login page immediately
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If they have a token, let them enter the page!
  return children;
}

export default ProtectedRoute;