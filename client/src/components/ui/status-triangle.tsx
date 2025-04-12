import React from 'react';

type ParticipationStatus = 'confirmed' | 'approved' | 'pending' | 'rejected';

interface StatusTriangleProps {
  status: ParticipationStatus;
  className?: string;
}

const getStatusColor = (status: ParticipationStatus): string => {
  switch (status) {
    case 'confirmed':
    case 'approved':
      return '#10b981'; // Verde
    case 'pending':
      return '#f59e0b'; // Amarelo/Âmbar
    case 'rejected':
      return '#ef4444'; // Vermelho
    default:
      return '#6b7280'; // Cinza
  }
};

const getStatusText = (status: ParticipationStatus): string => {
  switch (status) {
    case 'confirmed':
      return 'Confirmado';
    case 'approved':
      return 'Aprovado';
    case 'pending':
      return 'Aguardando';
    case 'rejected':
      return 'Recusado';
    default:
      return 'Desconhecido';
  }
};

const StatusTriangle: React.FC<StatusTriangleProps> = ({ status, className = '' }) => {
  const color = getStatusColor(status);
  
  return (
    <div className={`${className}`}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform rotate-180"
      >
        <path
          d="M8 0L16 16H0L8 0Z"
          fill={color}
        />
      </svg>
    </div>
  );
};

export default StatusTriangle;