import { useRef, useEffect } from "react";

/**
 * Componente de rede com pontos se conectando
 * Cria um efeito visual de nós conectados em uma rede
 */
export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Redimensionar o canvas para ocupar toda a tela
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Definir pontos na rede
    const pointCount = 60;
    const points: { x: number; y: number; dx: number; dy: number; radius: number; }[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 0.5,
      });
    }
    
    // Função para desenhar a rede
    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Desenhar pontos
      for (let i = 0; i < pointCount; i++) {
        const point = points[i];
        
        // Atualizar posição
        point.x += point.dx;
        point.y += point.dy;
        
        // Rebater nas bordas
        if (point.x < 0 || point.x > canvas.width) point.dx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.dy *= -1;
        
        // Desenhar ponto
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        
        // Desenhar linhas conectando pontos próximos
        for (let j = i + 1; j < pointCount; j++) {
          const otherPoint = points[j];
          const distance = Math.sqrt(
            Math.pow(point.x - otherPoint.x, 2) + Math.pow(point.y - otherPoint.y, 2)
          );
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 - distance / 3000})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        }
      }
      
      requestAnimationFrame(drawNetwork);
    };
    
    const animationId = requestAnimationFrame(drawNetwork);
    
    // Limpar evento e animação ao desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full z-0 bg-transparent pointer-events-none"
    />
  );
}