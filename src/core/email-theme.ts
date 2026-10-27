// Shared by the visual editor and the server-side email serializer.
export const anzEmailTheme = {
  extends: 'basic' as const,
  styles: {
    body: {
      backgroundColor: '#f3f5f8',
      color: '#06234f',
      fontFamily: 'Arial, sans-serif',
      padding: '32px 16px',
    },
    container: { backgroundColor: '#ffffff', width: '600px', padding: '40px', borderRadius: '8px' },
    h1: {
      color: '#06234f',
      fontSize: '28px',
      fontWeight: '500',
      lineHeight: '1.3',
      margin: '0 0 24px',
    },
    h2: {
      color: '#06234f',
      fontSize: '22px',
      fontWeight: '500',
      lineHeight: '1.4',
      margin: '24px 0 16px',
    },
    paragraph: { color: '#324760', fontSize: '15px', lineHeight: '1.7', margin: '0 0 20px' },
    link: { color: '#243085', textDecoration: 'underline' },
    button: {
      backgroundColor: '#243085',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      padding: '14px 24px',
      borderRadius: '6px',
      textDecoration: 'none',
    },
  },
}
