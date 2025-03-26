import { useEffect, useRef, useState } from "react";

interface SmokeLogoProps {
  text: string;
  color?: string;
  className?: string;
}

export default function SmokeLogo({ text, color = "#FF9900", className = "" }: SmokeLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const smokeRef = useRef<SVGGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 150 });
  const [playing, setPlaying] = useState(true);
  
  // Função para medir o tamanho real do texto
  useEffect(() => {
    if (textRef.current) {
      const bbox = textRef.current.getBBox();
      setDimensions({
        width: bbox.width + 100, // Margem para a fumaça
        height: bbox.height + 100 // Margem para a fumaça
      });
    }
  }, [text]);
  
  // Animação de fumaça
  useEffect(() => {
    if (!smokeRef.current || !svgRef.current) return;
    
    const smokeParticles: SVGCircleElement[] = [];
    const smokeGroup = smokeRef.current;
    const svg = svgRef.current;
    
    // Limpar partículas antigas quando o componente for desmontado
    return () => {
      smokeParticles.forEach(particle => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });
    };
  }, [playing]);
  
  // Animação orgânica de dissipação
  useEffect(() => {
    if (!smokeRef.current || !textRef.current) return;
    
    const smokeGroup = smokeRef.current;
    const text = textRef.current;
    const textContent = text.textContent || "";
    const smokeParticles: SVGCircleElement[] = [];
    
    // Limpar partículas existentes
    while (smokeGroup.firstChild) {
      smokeGroup.removeChild(smokeGroup.firstChild);
    }
    
    // Cria partículas iniciais baseadas no texto
    const letters = textContent.split('');
    const letterPositions: { x: number, y: number, width: number }[] = [];
    
    // Calcula a posição de cada letra
    let totalWidth = 0;
    letters.forEach((letter, i) => {
      // Estimativa de largura por letra (ajuste conforme necessário)
      const letterWidth = letter === 'I' ? 15 : 40;
      letterPositions.push({
        x: totalWidth + letterWidth / 2,
        y: 60, // Altura do texto
        width: letterWidth
      });
      totalWidth += letterWidth;
    });
    
    // Criar filtro para desfoque gaussiano
    const xmlns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(xmlns, "defs");
    const filter = document.createElementNS(xmlns, "filter");
    filter.setAttribute("id", "smoke-blur");
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");
    
    const gaussianBlur = document.createElementNS(xmlns, "feGaussianBlur");
    gaussianBlur.setAttribute("in", "SourceGraphic");
    gaussianBlur.setAttribute("stdDeviation", "3");
    filter.appendChild(gaussianBlur);
    defs.appendChild(filter);
    
    if (!svgRef.current?.querySelector("defs")) {
      svgRef.current?.appendChild(defs);
    }
    
    // Cria as partículas de fumaça para cada letra
    letterPositions.forEach((pos, letterIndex) => {
      const particleCount = Math.floor(Math.random() * 5) + 8; // 8-12 partículas por letra
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElementNS(xmlns, "circle");
        const size = Math.random() * 15 + 5;
        
        // Posiciona partículas em volta da letra
        const offsetX = (Math.random() - 0.5) * pos.width * 1.2;
        const offsetY = (Math.random() - 0.5) * 20;
        
        particle.setAttribute("cx", `${pos.x + offsetX}`);
        particle.setAttribute("cy", `${pos.y + offsetY}`);
        particle.setAttribute("r", `${size}`);
        
        // Gradiente de cores para a fumaça
        const colorValue = i % 2 === 0 ? color : "#FFC266";
        particle.setAttribute("fill", colorValue);
        particle.setAttribute("opacity", (Math.random() * 0.5 + 0.1).toString());
        particle.setAttribute("filter", "url(#smoke-blur)");
        
        smokeGroup.appendChild(particle);
        smokeParticles.push(particle);
        
        // Anima a partícula
        const duration = Math.random() * 3000 + 2000; // 2-5 segundos
        const delay = Math.random() * 1000 * letterIndex; // Atraso baseado na posição da letra
        
        setTimeout(() => {
          // Posição final
          const finalX = pos.x + offsetX + (Math.random() - 0.5) * 100;
          const finalY = pos.y - Math.random() * 80 - 30; // Sempre para cima
          const finalSize = size * (Math.random() * 0.5 + 0.5); // Reduz o tamanho
          
          // Aplica a animação
          particle.style.transition = `cx ${duration}ms ease-out, cy ${duration}ms ease-out, r ${duration}ms ease-out, opacity ${duration}ms ease-out`;
          
          // Inicia a animação após um pequeno atraso
          setTimeout(() => {
            particle.setAttribute("cx", finalX.toString());
            particle.setAttribute("cy", finalY.toString());
            particle.setAttribute("r", finalSize.toString());
            particle.setAttribute("opacity", "0"); // Desaparece gradualmente
            
            // Remove a partícula depois da animação
            setTimeout(() => {
              if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
              }
              
              // Quando a última partícula da última letra terminar, recria a animação
              if (letterIndex === letterPositions.length - 1 && i === particleCount - 1) {
                // Aguarda um tempo antes de reiniciar
                setTimeout(() => {
                  if (playing) {
                    // Recria a animação se ainda estiver ativa
                    setPlaying(false);
                    setTimeout(() => setPlaying(true), 50);
                  }
                }, 1000);
              }
            }, duration);
          }, 10);
        }, delay);
      }
    });
    
  }, [playing, color, text]);
  
  const handleClick = () => {
    setPlaying(prev => !prev);
  };
  
  return (
    <div className={`relative ${className}`} onClick={handleClick}>
      <svg 
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        {/* Grupo para partículas de fumaça */}
        <g ref={smokeRef} className="smoke-particles"></g>
        
        {/* Texto que se transformará em fumaça */}
        <text
          ref={textRef}
          x="50%"
          y="60%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="60px"
          fontFamily="Futura, 'Trebuchet MS', Arial, sans-serif"
          fontWeight="600"
          style={{ letterSpacing: '0.05em' }}
        >
          {text}
        </text>
      </svg>
    </div>
  );
}