'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { HeroCanvas3D } from './hero-canvas-3d';
import styles from './hero-canvas-3d.module.css';

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden" style={{ height: '100vh', minHeight: '600px', backgroundColor: 'var(--brand-navy)' }}>
      {/* 3D Background */}
      <HeroCanvas3D />

      {/* DOM Overlay */}
      <div className="absolute inset-0 z-10 flex items-center max-w-7xl mx-auto px-6 pointer-events-none">
        <div className="max-w-2xl text-left pointer-events-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8" 
               style={{ 
                 background: 'var(--brand-glass)', 
                 border: '1px solid var(--brand-border)',
                 boxShadow: '0 0 0 0 rgba(0,191,166,0.4)',
                 animation: 'pulse-border 2s infinite'
               }}>
            <ShieldCheck size={16} style={{ color: 'var(--brand-teal)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-teal)', fontFamily: 'var(--font-dm-sans)' }}>
              Ghana FDA &middot; GRA Compliant
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.1]" 
              style={{ color: 'var(--brand-white)', fontFamily: 'var(--font-syne)' }}>
            Pharmaceutical Intelligence <br />
            <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-electric)] animate-pulse">
              Reimagined for Ghana
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-xl" 
             style={{ color: 'rgba(240, 246, 255, 0.7)', fontFamily: 'var(--font-dm-sans)' }}>
            Branch-scoped POS &middot; Real-time Stock &middot; VAT-ready Invoicing <br/>
            GraphQL-powered &middot; Redis live updates
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link 
              href="/login"
              className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold text-[var(--brand-navy)] transition-all active:scale-95"
              style={{ background: 'var(--brand-electric)', boxShadow: '0 0 20px rgba(29, 233, 182, 0.4)' }}
            >
              Launch POS
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a 
              href="#demo"
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold transition-all active:scale-95"
              style={{ 
                background: 'var(--brand-glass)', 
                border: '1px solid var(--brand-border)', 
                color: 'var(--brand-electric)' 
              }}
            >
              View Demo
            </a>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 0 rgba(0, 191, 166, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(0, 191, 166, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 191, 166, 0); }
        }
      `}} />
    </section>
  );
}
