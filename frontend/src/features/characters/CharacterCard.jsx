import deleteIcon from '../../assets/icons/trash-can.png';
import editIcon from '../../assets/icons/pencil.png';
import { backendUrl } from '../../api';

export default function CharacterCard({ character, onDelete, onEdit, onOpen }) {
  const imageUrl = character.character_image
    ? backendUrl(`/storage/${character.character_image}`)
    : null;

  return (
    <div
      onClick={onOpen}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        position: 'relative',
        height: '380px',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#374151',
        backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        display: 'block',
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-4px)'; }}
      onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 10 }}>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          title="Edytuj"
          style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}
        >
          <img src={editIcon} alt="Edytuj" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title="Usuń"
          style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}
        >
          <img src={deleteIcon} alt="Usuń" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
        </button>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '40px 20px 20px 20px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6), transparent)',
        color: 'white',
      }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
          {character.name}
        </h2>

        {character.group_name && (
          <span style={{ backgroundColor: '#4B5563', padding: '3px 10px', borderRadius: '15px', fontSize: '0.8rem', display: 'inline-block', marginBottom: '10px' }}>
            {character.group_name}
          </span>
        )}

        <p style={{
          margin: 0,
          fontSize: '0.9rem',
          color: '#e5e7eb',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {character.description || 'Brak opisu postaci.'}
        </p>
      </div>
    </div>
  );
}
