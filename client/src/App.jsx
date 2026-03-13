import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Sidebar from './sidebar';
import Dashboard from './dashboard';
import Admission from './admin/admission';
import Payment from './admin/payment';
import Stream from './admin/stream';
import Student from './admin/student';
import ContactForm from './feedback/contactfrom';
import Feedback from './feedback/feedback';
import Grievance from './feedback/Grievance';
import Inquiries from './feedback/Inquiries';
import BookIssue from './Library/bookissue';
import Fine from './Library/fine';
import Inventory from './Library/inventory';
import Member from './Library/member';
import Faculty from './website/faculty';
import News from './website/news';
import Slider from './website/slider';
import Ticker from './website/ticker';

// Accounting/Business Pages
import AuthTest from './pages/AuthTest';
import Parties from './pages/Parties';
import Items from './pages/Items';
import SalesInvoices from './pages/SalesInvoices';

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        <Sidebar className="w-64 fixed h-full" />
        <div className="flex-grow overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* Auth Test */}
            <Route path="/auth-test" element={<AuthTest />} />
            
            {/* Accounting/Business Routes */}
            <Route path="/parties" element={<Parties />} />
            <Route path="/items" element={<Items />} />
            <Route path="/sales-invoices" element={<SalesInvoices />} />
            
            {/* Admin Routes */}
            <Route path="/admin/admission" element={<Admission />} />
            <Route path="/admin/payment" element={<Payment />} />
            <Route path="/admin/stream" element={<Stream />} />
            <Route path="/admin/student" element={<Student />} />
            
            {/* Feedback Routes */}
            <Route path="/feedback/contact" element={<ContactForm />} />
            <Route path="/feedback/feedback" element={<Feedback />} />
            <Route path="/feedback/grievance" element={<Grievance />} />
            <Route path="/feedback/inquiries" element={<Inquiries />} />
            
            {/* Library Routes */}
            <Route path="/library/bookissue" element={<BookIssue />} />
            <Route path="/library/fine" element={<Fine />} />
            <Route path="/library/inventory" element={<Inventory />} />
            <Route path="/library/member" element={<Member />} />
            
            {/* Website Routes */}
            <Route path="/website/faculty" element={<Faculty />} />
            <Route path="/website/news" element={<News />} />
            <Route path="/website/slider" element={<Slider />} />
            <Route path="/website/ticker" element={<Ticker />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
