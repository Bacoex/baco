import { useEffect, useRef } from 'react';

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

    // Configuração do canvas para acompanhar o tamanho da tela
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Configuração dos nós
    const nodes: {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      color: string;
    }[] = [];

    // Cria nós com posições aleatórias
    const createNodes = () => {
      const nodeCount = Math.min(Math.floor(window.innerWidth / 50), 15); // Limitado a 15 para performance
      nodes.length = 0;

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          vx: Math.random() * 0.2 - 0.1,
          vy: Math.random() * 0.2 - 0.1,
          color: `rgba(255, 153, 0, ${Math.random() * 0.5 + 0.2})` // Laranja com opacidade variável
        });
      }
    };

    createNodes();

    // Desenha as conexões entre os nós
    const drawLines = () => {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 200) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            
            // Gradiente suave com opacidade baseada na distância
            const opacity = 1 - distance / 200;
            ctx.strokeStyle = `rgba(255, 153, 0, ${opacity * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };

    // Desenha os nós
    const drawNodes = () => {
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
      }
    };

    // Atualiza as posições dos nós
    const updateNodes = () => {
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        // Se o nó sair da tela, reverte sua direção
        if (node.x < 0 || node.x > canvas.width) node.vx = -node.vx;
        if (node.y < 0 || node.y > canvas.height) node.vy = -node.vy;
      }
    };

    // Loop de animação
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawLines();
      drawNodes();
      updateNodes();
      
      animationFrameId = requestAnimationFrame(animate);
    };

    let animationFrameId = requestAnimationFrame(animate);

    // Limpeza ao desmontar
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 bg-black"
    />
  );
}