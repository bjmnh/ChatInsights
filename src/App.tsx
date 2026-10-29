import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/sonner';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import AuthPage from './pages/AuthPage';
import EmailConfirmationPage from './pages/EmailConfirmationPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import RefundPage from './pages/RefundPage';
import ContactPage from './pages/ContactPage';
import './App.css';

function Shell() {
  const { pathname } = useLocation();
  const immersive = pathname.startsWith('/report');

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      {!immersive && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report/:fileId/:reportType" element={<ReportPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/confirm" element={<EmailConfirmationPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/refunds" element={<RefundPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/support" element={<ContactPage />} />
        </Routes>
      </main>
      {!immersive && <Footer />}
      <Toaster theme="dark" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Shell />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
