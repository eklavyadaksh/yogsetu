import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PoseCard } from '../components/PoseCard';
import { LoginPage } from '../pages/LoginPage';
import { AiConsultationHero } from '../components/AiConsultationHero';

// Wrapper for router & context providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>{ui}</BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('Frontend Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // Test 1: Navbar Brand & Links
  it('1. Navbar renders brand title and navigation links', () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByText('YogSetu')).toBeInTheDocument();
    expect(screen.getByText(/BRIDGE/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });

  // Test 2: Footer Clinical Safety Disclaimer
  it('2. Footer renders safety medical disclaimer and tracking note', () => {
    renderWithProviders(<Footer />);
    expect(
      screen.getByText(/Hum therapist ko replace nahi karte/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Yeh doctor ki salah nahi hai/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/100% On-Device Pose Tracking/i)
    ).toBeInTheDocument();
  });

  // Test 3: PoseCard Rendering & Click Handling
  it('3. PoseCard renders pose information and triggers onStart callback', () => {
    const handleStart = vi.fn();

    renderWithProviders(
      <PoseCard
        id="tadasana"
        primaryName="Mountain Pose"
        subtitleName="Tadasana"
        holdSeconds={25}
        sets={2}
        cameraSupported={true}
        caution="Stand evenly on both feet."
        onStart={handleStart}
      />
    );

    expect(screen.getByText('Mountain Pose')).toBeInTheDocument();
    expect(screen.getByText('Tadasana')).toBeInTheDocument();
    const startButton = screen.getByRole('button');
    expect(startButton).toBeInTheDocument();
    fireEvent.click(startButton);
    expect(handleStart).toHaveBeenCalled();
  });

  // Test 4: LoginPage Role Switch & Demo Account Pre-fill
  it('4. LoginPage allows role selection and demo account 1-click login', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/Sign In to Your Sanctuary/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Account Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Normal User/i)).toBeInTheDocument();
    expect(screen.getByText(/Doctor \/ PT/i)).toBeInTheDocument();

    // Click demo account button for Dr. Demo
    const demoDoctorBtn = screen.getByText(/Dr\. Demo/i);
    fireEvent.click(demoDoctorBtn);

    const input = screen.getByPlaceholderText(/priya@.*or 9876543210/i) as HTMLInputElement;
    expect(input.value).toBe('demo@yogsetu.test');
  });

  // Test 5: AiConsultationHero Preset Chips Interaction
  it('5. AiConsultationHero renders Sanskrit Shloka and fills textarea on preset chip click', () => {
    const handleSubmit = vi.fn();
    renderWithProviders(<AiConsultationHero onSubmit={handleSubmit} />);

    // Check Shloka display
    expect(screen.getByText('योगः कर्मसु कौशलम्')).toBeInTheDocument();

    // Check clicking a preset chip
    const deskWorkerChip = screen.getByText(/Desk Worker Relief/i);
    expect(deskWorkerChip).toBeInTheDocument();
    fireEvent.click(deskWorkerChip);

    const textarea = screen.getByPlaceholderText(/How can YogSetu help your body today/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Lower back stiffness and neck pain');
  });
});
