# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run serve` (Firebase emulators)
- **Deploy functions**: `npm run deploy`
- **View logs**: `npm run logs`
- **Firebase shell**: `npm run shell`
- **Linting**: Currently disabled (`npm run lint` outputs "Linting disabled")

## Architecture Overview

This is a Firebase Cloud Functions project for the FOR+NAP festival member management system. The codebase consists of:

### Core Components

1. **Firebase Cloud Functions** (`index.js`):
   - `processHelloAssoWebhook`: Main webhook handler for Hello Asso payment processing
   - `validateQRCode`: QR code validation for member verification
   - `resendMemberEmail`: Resend member confirmation emails with QR codes

2. **Admin Panel** (`admin/`):
   - Web-based administration interface for member management
   - Real-time dashboard with statistics and member search/filtering
   - Built with vanilla JS, connects directly to Firestore
   - Features: member search, filtering, CSV export, QR code display

3. **Manual Member Registration** (`manual-inscription-member/`):
   - Standalone registration form for manual member enrollment
   - Independent from Hello Asso integration

### Data Flow

1. Hello Asso → Webhook → Cloud Function (`processHelloAssoWebhook`)
2. Cloud Function → Firestore (`members` collection)
3. Admin Panel → Direct Firestore connection for real-time display
4. Email generation with QR codes using Canvas and Nodemailer

### Key Technologies

- **Firebase**: Cloud Functions, Firestore, Admin SDK
- **Email**: Nodemailer with SMTP server (mail.4nap.fr)
- **QR Code Generation**: `qrcode` library with Canvas for custom styling
- **Member Cards**: Generated using Canvas with custom background images

### Firestore Schema

The `members` collection structure:
```javascript
{
  uid: "uuid-unique",
  email: "membre@email.com",
  firstName: "Jean",
  lastName: "Dupont",
  ticketType: "Pass Festival",
  postalCode: "83500",
  birthDate: "1990-01-01",
  phone: "+33123456789",
  createdAt: Timestamp,
  "end-member": Timestamp, // 31/12/2025
  "member-type": "4nap-festival"
}
```

### Development Notes

- Node.js 20 runtime environment
- Firebase configuration in `firebase.json`
- Admin panel can be served locally with `python -m http.server 8080` or `npx serve . -p 8080`
- QR codes use format: `FORNAP-MEMBER:{uid}`
- Member cards include custom background images and festival branding