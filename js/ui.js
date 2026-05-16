export class HUD {
    constructor() {
        this.hitNumbers = [];
    }
    
    drawHealthBars(ctx, p1, p2) {
        const barWidth = 400;
        const barHeight = 30;
        const barY = 30;
        const padding = 40;
        
        this.drawSingleHealthBar(ctx, p1, padding, barY, barWidth, barHeight, 1);
        this.drawSingleHealthBar(ctx, p2, ctx.canvas.width - padding - barWidth, barY, barWidth, barHeight, -1);
    }
    
    drawSingleHealthBar(ctx, player, x, y, width, height, dir) {
        const hpPercent = player.hp / player.maxHp;
        
        ctx.save();
        
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        
        let barColor;
        if (hpPercent > 0.6) {
            barColor = `rgb(${Math.round((1 - hpPercent) * 2 * 34 + 34)}, 255, 34)`;
        } else if (hpPercent > 0.3) {
            barColor = `rgb(255, ${Math.round(hpPercent * 3 * 200)}, 34)`;
        } else {
            barColor = `rgb(255, ${Math.round(hpPercent * 3 * 50)}, 34)`;
        }
        
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        if (dir === 1) {
            gradient.addColorStop(0, barColor);
            gradient.addColorStop(1, hpPercent > 0.5 ? '#22cc44' : '#cc4422');
        } else {
            gradient.addColorStop(0, hpPercent > 0.5 ? '#22cc44' : '#cc4422');
            gradient.addColorStop(1, barColor);
        }
        
        ctx.fillStyle = gradient;
        const fillX = dir === 1 ? x : x + width * (1 - hpPercent);
        ctx.fillRect(fillX, y + 2, width * hpPercent, height - 4);
        
        ctx.restore();
        
        ctx.save();
        ctx.font = 'bold 16px Orbitron';
        ctx.fillStyle = player.color;
        ctx.shadowColor = player.glowColor;
        ctx.shadowBlur = 10;
        ctx.textAlign = dir === 1 ? 'left' : 'right';
        ctx.fillText(`P${player.playerNum} - ${player.weapon.name}`, dir === 1 ? x : x + width, y - 8);
        ctx.restore();
        
        ctx.save();
        ctx.font = 'bold 14px Orbitron';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`${player.hp}`, x + width / 2, y + 20);
        ctx.restore();
    }
    
    drawSpecialMeters(ctx, p1, p2) {
        const meterWidth = 200;
        const meterHeight = 12;
        const meterY = 75;
        const padding = 40;
        
        this.drawSingleSpecialMeter(ctx, p1, padding, meterY, meterWidth, meterHeight, 1);
        this.drawSingleSpecialMeter(ctx, p2, ctx.canvas.width - padding - meterWidth, meterY, meterWidth, meterHeight, -1);
    }
    
    drawSingleSpecialMeter(ctx, player, x, y, width, height, dir) {
        const meterPercent = player.specialMeter / 100;
        
        ctx.save();
        ctx.fillStyle = '#0a0a15';
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        
        if (meterPercent >= 1) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = '#6366f1';
            ctx.shadowBlur = 0;
        }
        
        const fillX = dir === 1 ? x : x + width * (1 - meterPercent);
        ctx.fillRect(fillX, y + 1, width * meterPercent, height - 2);
        
        ctx.restore();
    }
    
    drawTimer(ctx, seconds, maxSeconds = 60) {
        const x = ctx.canvas.width / 2;
        const y = 50;
        
        ctx.save();
        ctx.font = 'bold 36px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (seconds <= 10 && seconds > 0) {
            const flash = Math.sin(Date.now() * 0.01) > 0;
            ctx.fillStyle = flash ? '#FF0000' : '#FF6666';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 20;
        } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 10;
        }
        
        ctx.fillText(seconds.toString().padStart(2, '0'), x, y);
        ctx.restore();
    }
    
    drawComboCounter(ctx, player, x, y) {
        if (player.comboCount < 2) return;
        
        ctx.save();
        
        let color, text;
        if (player.comboCount >= 12) {
            color = '#FF0000';
            text = `COMBO x${player.comboCount}!`;
        } else if (player.comboCount >= 7) {
            color = '#FF8800';
            text = `COMBO x${player.comboCount}`;
        } else {
            color = '#FFD700';
            text = `COMBO x${player.comboCount}`;
        }
        
        const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        ctx.font = 'bold 24px "Press Start 2P"';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, 0);
        
        ctx.restore();
    }
    
    addHitNumber(x, y, damage, type = 'normal') {
        let color, size;
        if (type === 'critical') {
            color = '#FF0000';
            size = Math.min(40, 15 + damage * 0.5);
        } else if (type === 'counter') {
            color = '#FFD700';
            size = Math.min(35, 12 + damage * 0.4);
        } else {
            color = '#FFFFFF';
            size = Math.min(30, 10 + damage * 0.3);
        }
        
        this.hitNumbers.push({
            x, y,
            vy: -2,
            life: 40,
            maxLife: 40,
            damage,
            color,
            size
        });
    }
    
    drawHitNumbers(ctx) {
        for (let i = this.hitNumbers.length - 1; i >= 0; i--) {
            const hn = this.hitNumbers[i];
            hn.y += hn.vy;
            hn.life--;
            
            const alpha = hn.life / hn.maxLife;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${hn.size}px "Press Start 2P"`;
            ctx.fillStyle = hn.color;
            ctx.shadowColor = hn.color;
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText(hn.damage.toString(), hn.x, hn.y);
            ctx.restore();
            
            if (hn.life <= 0) {
                this.hitNumbers.splice(i, 1);
            }
        }
    }
    
    drawWeaponIcon(ctx, player, cornerX, cornerY) {
        ctx.save();
        ctx.font = '12px Orbitron';
        ctx.fillStyle = '#AAAAAA';
        ctx.textAlign = 'center';
        ctx.fillText(player.weapon.name, cornerX, cornerY);
        
        if (player.weapon.ammo !== null) {
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${player.weapon.ammo}/${player.weapon.maxAmmo}`, cornerX, cornerY + 15);
        }
        ctx.restore();
    }
    
    drawRoundIndicators(ctx, p1Wins, p2Wins, maxRounds = 3) {
        const winsNeeded = Math.ceil(maxRounds / 2);
        const dotSize = 10;
        const dotSpacing = 20;
        
        for (let i = 0; i < winsNeeded; i++) {
            ctx.save();
            
            ctx.beginPath();
            ctx.arc(240 + i * dotSpacing, 95, dotSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = i < p1Wins ? '#FF2D55' : '#333344';
            ctx.fill();
            ctx.strokeStyle = '#666688';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(ctx.canvas.width - 240 - i * dotSpacing, 95, dotSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = i < p2Wins ? '#00B8FF' : '#333344';
            ctx.fill();
            ctx.strokeStyle = '#666688';
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    clear() {
        this.hitNumbers = [];
    }
}
