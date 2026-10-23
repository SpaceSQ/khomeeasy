import de from '../../messages/de.json';

export default function RootNotFound() {
  return (
    <html lang="de-DE">
      <body
        style={{
          margin: 0,
          background: '#F6F3EE',
          color: '#1C1917',
          fontFamily: 'Georgia, serif',
          padding: '4rem 1.5rem'
        }}
      >
        <h1>{de.NotFound.title}</h1>
        <p>{de.NotFound.body}</p>
      </body>
    </html>
  );
}
