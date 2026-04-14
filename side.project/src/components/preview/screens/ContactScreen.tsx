'use client'

import type { ScreenSection } from '@/lib/types/generator'
import type { SocialLink } from '@/lib/types/scraper'
import { ICONS } from '@/lib/utils/icons'

interface ContactScreenProps {
  className: string
  sections: ScreenSection[]
}

export default function ContactScreen({ className, sections }: ContactScreenProps) {
  const header = sections.find(s => s.type === 'header')
  const contactInfo = sections.find(s => s.type === 'contact-info')
  const socialLinks = sections.find(s => s.type === 'social-links')
  const contactForm = sections.find(s => s.type === 'contact-form')

  const socialIconMap: Record<string, string> = {
    facebook: 'external-link',
    twitter: 'external-link',
    instagram: 'camera',
    linkedin: 'external-link',
    youtube: 'external-link',
    tiktok: 'external-link',
    pinterest: 'external-link',
    other: 'external-link',
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="contact-header">
        <div className="contact-title">{(header?.data.title as string) || 'Contact Us'}</div>
        <div className="contact-subtitle">{(header?.data.subtitle as string) || 'Get in touch'}</div>
      </div>

      {/* Map Placeholder */}
      <div className="contact-map">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS.map }} />
        <span style={{ marginLeft: 8 }}>Map View</span>
      </div>

      {/* Contact Info */}
      {contactInfo && (
        <div className="contact-info-list">
          {(contactInfo.data.items as { label: string; value: string; icon: string }[]).map((item, i) => (
            <div key={i} className="contact-info-item">
              <div className="contact-info-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[item.icon] || ICONS.grid }} />
              </div>
              <div>
                <div className="contact-info-label">{item.label}</div>
                <div className="contact-info-value">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Social Links */}
      {socialLinks && (socialLinks.data.links as SocialLink[]).length > 0 && (
        <div className="contact-social">
          {(socialLinks.data.links as SocialLink[]).map((link, i) => (
            <div key={i} className="contact-social-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[socialIconMap[link.platform] || 'external-link'] }} />
            </div>
          ))}
        </div>
      )}

      {/* Contact Form */}
      {contactForm && (
        <div>
          <div className="contact-form-title">{(contactForm.data.title as string) || 'Send a Message'}</div>
          {(contactForm.data.fields as string[]).map((field, i) => (
            <div key={i}>
              <label className="form-label">{field}</label>
              {field.toLowerCase() === 'message' ? (
                <textarea
                  className="form-input"
                  style={{ minHeight: 80, resize: 'none' }}
                  placeholder={`Your ${field.toLowerCase()}...`}
                  readOnly
                />
              ) : (
                <input
                  className="form-input"
                  placeholder={`Your ${field.toLowerCase()}`}
                  readOnly
                />
              )}
            </div>
          ))}
          <button className="btn-primary" style={{ marginTop: 8 }}>Send Message</button>
        </div>
      )}
    </div>
  )
}
