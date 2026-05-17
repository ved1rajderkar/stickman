export class HUD {
    constructor() {
        this.hitNumbers = [];
        this.damageFlash = { p1: 0, p2: 0 };
        this.hpDisplay = { p1: 100, p2: 100 };
    }
    
    update() {
        // Smooth damage flash decay
        if (this.damageFlash.p1 > 0) this.damageFlash.p1 -= 0.05;
        if (this.damageFlash.p2 > 0) this.damageFlash.p2 -= 0.05;
        
        // Smooth HP display transitions
        if (this.hpDisplay.p1 !== undefined) {
            const diff = this.hpDisplay.p1 - this._targetHp1;
            if (Math.abs(diff) > 0.5) {
                this.hpDisplay.p1 -= diff * 0.15;
            } else {
                this.hpDisplay.p1 = this._targetHp1;
            }
        }
        if (this.hpDisplay.p2 !== undefined) {
            const diff = this.hpDisplay.p2 - this._targetHp2;
            if (Math.abs(diff) > 0.5) {
                this.hpDisplay.p2 -= diff * 0.15;
            } else {
                this.hpDisplay.p2 = this._targetHp2;
            }
        }
    }
    
    drawHealthBars(ctx, p1, p2) {
        if (!p1 || !p2) return;
        
        this._targetHp1 = p1.hp;
        this._targetHp2 = p2.hp;
        
        const barWidth = 420;
        const barHeight = 36;
        const barY = 35;
        const padding = 50;
        
        this.drawSingleHealthBar(ctx, p1, padding, barY, barWidth, barHeight, 1, this.damageFlash.p1);
        this.drawSingleHealthBar(ctx, p2, ctx.canvas.width - padding - barWidth, barY, barWidth, barHeight, -1, this.damageFlash.p2);
    }
    
    triggerDamageFlash(playerNum) {
        if (playerNum === 1) this.damageFlash.p1 = 1.0;
        else this.damageFlash.p2 = 1.0;
    }
    
    drawSingleHealthBar(ctx, player, x, y, width, height, dir, flashAlpha) {
        const hpPercent = player.hp / player.maxHp;
        const displayPercent = Math.max(0, this.hpDisplay[`p${player.playerNum}`] / player.maxHp);
        
        ctx.save();
        
        // Outer border with neon glow
        ctx.shadowColor = player.glowColor;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        ctx.shadowBlur = 0;
        
        // Damage trail (white bar showing previous HP)
        if (displayPercent > hpPercent) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            const trailX = dir === 1 ? x + width * hpPercent : x + width * displayPercent;
            ctx.fillRect(trailX, y + 3, width * (displayPercent - hpPercent), height - 6);
        }
        
        // Main HP bar with gradient
        let barColor;
        if (hpPercent > 0.6) {
            barColor = `rgb(${Math.round((1 - hpPercent) * 2 * 34 + 34)}, 255, 65)`;
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
        ctx.fillRect(fillX, y + 3, width * hpPercent, height - 6);
        
        // Damage flash overlay
        if (flashAlpha > 0) {
            ctx.fillStyle = `rgba(255, 50, 50, ${flashAlpha * 0.5})`;
            ctx.fillRect(x, y, width, height);
        }
        
        // Scanline effect
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let sy = y; sy < y + height; sy += 4) {
            ctx.fillRect(x, sy, width, 1);
        }
        
        ctx.restore();
        
        // Player name and weapon
        ctx.save();
        ctx.font = 'bold 14px Orbitron';
        ctx.fillStyle = player.color;
        ctx.shadowColor = player.glowColor;
        ctx.shadowBlur = 8;
        ctx.textAlign = dir === 1 ? 'left' : 'right';
        ctx.fillText(`P${player.playerNum}`, dir === 1 ? x : x + width, y - 10);
        
        ctx.font = '11px Orbitron';
        ctx.fillStyle = '#AAAAAA';
        ctx.shadowBlur = 0;
        ctx.fillText(player.weapon.name, dir === 1 ? x + 40 : x + width - 40, y - 10);
        ctx.restore();
        
        // HP number
        ctx.save();
        ctx.font = 'bold 16px Orbitron';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 4;
        ctx.fillText(`${Math.ceil(player.hp)}`, x + width / 2, y + 22);
        ctx.restore();
    }
    
    drawSpecialMeters(ctx, p1, p2) {
        const meterWidth = 200;
        const meterHeight = 14;
        const meterY = 82;
        const padding = 50;
        
        this.drawSingleSpecialMeter(ctx, p1, padding, meterY, meterWidth, meterHeight, 1);
        this.drawSingleSpecialMeter(ctx, p2, ctx.canvas.width - padding - meterWidth, meterY, meterWidth, meterHeight, -1);
    }
    
    drawSingleSpecialMeter(ctx, player, x, y, width, height, dir) {
        const meterPercent = Math.min(1, player.specialMeter / 100);
        
        ctx.save();
        
        // Background
        ctx.fillStyle = '#0a0a15';
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        
        // Fill
        if (meterPercent >= 1) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15;
        } else {
            const gradient = ctx.createLinearGradient(x, y, x + width, y);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#8b5cf6');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 0;
        }
        
        const fillX = dir === 1 ? x : x + width * (1 - meterPercent);
        ctx.fillRect(fillX, y + 2, width * meterPercent, height - 4);
        
        // Label
        ctx.font = '9px Orbitron';
        ctx.fillStyle = meterPercent >= 1 ? '#FFD700' : '#888888';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(meterPercent >= 1 ? 'SPECIAL READY' : 'SPECIAL', x + width / 2, y + 10);
        
        ctx.restore();
    }
    
    drawTimer(ctx, seconds, maxSeconds = 60) {
        const x = ctx.canvas.width / 2;
        const y = 55;
        
        ctx.save();
        ctx.font = 'bold 32px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (seconds <= 10 && seconds > 0) {
            const flash = Math.sin(Date.now() * 0.015) > 0;
            ctx.fillStyle = flash ? '#FF0000' : '#FF6666';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 20;
        } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#6366f1';
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
        
        ctx.font = 'bold 20px Orbitron';
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
            ctx.font = `bold ${hn.size}px Orbitron`;
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
            ctx.arc(260 + i * dotSpacing, 102, dotSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = i < p1Wins ? '#FF2D55' : '#333344';
            ctx.fill();
            ctx.strokeStyle = '#666688';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(ctx.canvas.width - 260 - i * dotSpacing, 102, dotSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = i < p2Wins ? '#00B8FF' : '#333344';
            ctx.fill();
            ctx.strokeStyle = '#666688';
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    drawGameHUD(ctx, playerName, level, player, enemies, timer, maxTimer, levelConfig) {
        const isBoss = levelConfig && levelConfig.isBoss;

        ctx.save();

        ctx.font = 'bold 14px Orbitron';
        ctx.fillStyle = '#00FFFF';
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'left';
        ctx.fillText(playerName, 20, 30);

        ctx.font = 'bold 16px Orbitron';
        ctx.fillStyle = isBoss ? '#FF0000' : '#FFD700';
        ctx.shadowColor = isBoss ? '#FF0000' : '#FFD700';
        ctx.fillText(isBoss ? `BOSS ${level}` : `Level ${level}`, 20, 52);

        const hpPercent = player.hp / player.maxHp;
        const barWidth = 200;
        const barHeight = 16;
        const barX = 20;
        const barY = 65;

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        let barColor;
        if (hpPercent > 0.6) barColor = '#22cc44';
        else if (hpPercent > 0.3) barColor = '#ccaa22';
        else barColor = '#cc4422';

        ctx.fillStyle = barColor;
        ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * hpPercent, barHeight - 4);

        ctx.font = '10px Orbitron';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, barX + barWidth / 2, barY + 12);

        ctx.textAlign = 'right';
        ctx.font = 'bold 24px Orbitron';
        if (timer <= 10 && timer > 0) {
            const flash = Math.sin(Date.now() * 0.015) > 0;
            ctx.fillStyle = flash ? '#FF0000' : '#FF6666';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#6366f1';
            ctx.shadowBlur = 10;
        }
        ctx.fillText(timer.toString(), ctx.canvas.width - 20, 35);

        ctx.font = '10px Orbitron';
        ctx.fillStyle = '#888888';
        ctx.shadowBlur = 0;
        ctx.fillText('TIME', ctx.canvas.width - 20, 50);

        let enemyCount = 0;
        let totalEnemyHp = 0;
        let currentEnemyHp = 0;
        for (const enemy of enemies) {
            if (enemy.hp > 0) {
                enemyCount++;
                currentEnemyHp += enemy.hp;
            }
            totalEnemyHp += enemy.maxHp;
        }

        if (enemies.length > 0) {
            const enemyBarWidth = 200;
            const enemyBarHeight = 12;
            const enemyBarX = ctx.canvas.width - 20 - enemyBarWidth;
            const enemyBarY = 60;

            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(enemyBarX, enemyBarY, enemyBarWidth, enemyBarHeight);
            ctx.strokeStyle = '#FF4444';
            ctx.lineWidth = 1;
            ctx.strokeRect(enemyBarX, enemyBarY, enemyBarWidth, enemyBarHeight);

            const enemyHpPercent = totalEnemyHp > 0 ? currentEnemyHp / totalEnemyHp : 0;
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(enemyBarX + 2, enemyBarY + 2, (enemyBarWidth - 4) * enemyHpPercent, enemyBarHeight - 4);

            ctx.font = '9px Orbitron';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(`${enemyCount} enemy${enemyCount !== 1 ? 'ies' : ''}`, enemyBarX + enemyBarWidth / 2, enemyBarY + 10);
        }

        if (player.comboCount >= 2) {
            let comboColor;
            if (player.comboCount >= 12) comboColor = '#FF0000';
            else if (player.comboCount >= 7) comboColor = '#FF8800';
            else comboColor = '#FFD700';

            const scale = 1 + Math.sin(Date.now() * 0.01) * 0.05;
            ctx.save();
            ctx.translate(ctx.canvas.width / 2, 80);
            ctx.scale(scale, scale);
            ctx.font = 'bold 18px Orbitron';
            ctx.fillStyle = comboColor;
            ctx.shadowColor = comboColor;
            ctx.shadowBlur = 12;
            ctx.textAlign = 'center';
            ctx.fillText(`COMBO x${player.comboCount}`, 0, 0);
            ctx.restore();
        }

        ctx.restore();
    }

    clear() {
        this.hitNumbers = [];
        this.damageFlash = { p1: 0, p2: 0 };
        this.hpDisplay = { p1: 100, p2: 100 };
    }
}