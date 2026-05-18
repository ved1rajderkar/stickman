export class HUD {
    constructor() {
        this.hitNumbers = [];
        this.floatingDamages = [];
        this.damageFlash = { p1: 0, p2: 0 };
        this.hpDisplay = { p1: 100, p2: 100 };
        this.screenShakeThreshold = 0;
    }

    update() {
        if (this.damageFlash.p1 > 0) this.damageFlash.p1 -= 0.05;
        if (this.damageFlash.p2 > 0) this.damageFlash.p2 -= 0.05;

        for (let i = this.floatingDamages.length - 1; i >= 0; i--) {
            const fd = this.floatingDamages[i];
            fd.y += fd.vy;
            fd.vy *= 0.95;
            fd.life--;
            fd.alpha = fd.life / fd.maxLife;
            if (fd.life <= 0) this.floatingDamages.splice(i, 1);
        }

        for (let i = this.hitNumbers.length - 1; i >= 0; i--) {
            const hn = this.hitNumbers[i];
            hn.y += hn.vy;
            hn.life--;
            if (hn.life <= 0) this.hitNumbers.splice(i, 1);
        }
    }

    addFloatingDamage(x, y, damage, type = 'normal') {
        let color, size;
        if (type === 'critical') { color = '#ff2222'; size = Math.min(48, 20 + damage * 0.6); }
        else if (type === 'counter') { color = '#FFD700'; size = Math.min(40, 16 + damage * 0.5); }
        else if (type === 'parry') { color = '#00ffaa'; size = Math.min(36, 14 + damage * 0.4); }
        else if (type === 'heavy') { color = '#ff8844'; size = Math.min(44, 18 + damage * 0.55); }
        else { color = '#ffffff'; size = Math.min(32, 12 + damage * 0.35); }

        this.floatingDamages.push({
            x: x + (Math.random() - 0.5) * 20,
            y, vy: -3 - Math.random() * 2,
            life: 50, maxLife: 50,
            text: type === 'parry' ? 'PARRY!' : `${damage}%`,
            color, size, alpha: 1
        });
    }

    addHitNumber(x, y, damage, type = 'normal') {
        let color, size;
        if (type === 'critical') { color = '#FF0000'; size = Math.min(40, 15 + damage * 0.5); }
        else if (type === 'counter') { color = '#FFD700'; size = Math.min(35, 12 + damage * 0.4); }
        else { color = '#FFFFFF'; size = Math.min(30, 10 + damage * 0.3); }
        this.hitNumbers.push({ x, y, vy: -2, life: 40, maxLife: 40, damage, color, size });
    }

    drawGameHUD(ctx, players, timer, maxTimer, gameMode, roundInfo) {
        const p1 = players[0];
        const p2 = players[1];
        if (!p1) return;

        ctx.save();

        const barWidth = 380;
        const barHeight = 28;
        const barY = 25;
        const padding = 30;

        this.drawDamageBar(ctx, p1, padding, barY, barWidth, barHeight, 1);
        if (p2) this.drawDamageBar(ctx, p2, ctx.canvas.width - padding - barWidth, barY, barWidth, barHeight, -1);

        this.drawSpecialMeters(ctx, p1, p2, barY + barHeight + 8);

        this.drawTimer(ctx, timer, maxTimer);

        this.drawStocks(ctx, p1, padding, barY - 18, 1);
        if (p2) this.drawStocks(ctx, p2, ctx.canvas.width - padding, barY - 18, -1);

        if (gameMode === 'versus' || gameMode === 'local' || gameMode === 'team') {
            this.drawRoundWins(ctx, roundInfo);
        }

        if (p1.comboDisplayTimer > 0) {
            this.drawComboCounter(ctx, p1, ctx.canvas.width * 0.3, 120);
        }
        if (p2 && p2.comboDisplayTimer > 0) {
            this.drawComboCounter(ctx, p2, ctx.canvas.width * 0.7, 120);
        }

        this.drawFloatingDamages(ctx);
        this.drawHitNumbers(ctx);

        ctx.restore();
    }

    drawDamageBar(ctx, player, x, y, width, height, dir) {
        const dmgPercent = Math.min(player.damagePercent, 999);
        const displayPercent = Math.min(this.hpDisplay[`p${player.playerNum}`] || dmgPercent, 999);

        this.hpDisplay[`p${player.playerNum}`] = displayPercent + (dmgPercent - displayPercent) * 0.15;

        let barColor;
        if (dmgPercent < 50) barColor = '#ffffff';
        else if (dmgPercent < 100) barColor = '#ffcc44';
        else if (dmgPercent < 150) barColor = '#ff8844';
        else if (dmgPercent < 200) barColor = '#ff4444';
        else barColor = '#ff0000';

        ctx.save();

        ctx.fillStyle = '#0a0a15';
        ctx.strokeStyle = player.color;
        ctx.shadowColor = player.glowColor;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        ctx.shadowBlur = 0;

        const fillWidth = Math.min(width - 4, (dmgPercent / 300) * (width - 4));
        const fillX = dir === 1 ? x + 2 : x + width - 2 - fillWidth;

        const gradient = ctx.createLinearGradient(fillX, y, fillX + fillWidth, y);
        if (dir === 1) {
            gradient.addColorStop(0, barColor);
            gradient.addColorStop(1, dmgPercent > 100 ? '#ff2222' : barColor);
        } else {
            gradient.addColorStop(0, dmgPercent > 100 ? '#ff2222' : barColor);
            gradient.addColorStop(1, barColor);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(fillX, y + 2, fillWidth, height - 4);

        if (this.damageFlash[`p${player.playerNum}`] > 0) {
            ctx.fillStyle = `rgba(255, 50, 50, ${this.damageFlash[`p${player.playerNum}`] * 0.4})`;
            ctx.fillRect(x, y, width, height);
        }

        ctx.font = `bold ${height - 6}px Orbitron`;
        ctx.fillStyle = dmgPercent > 100 ? '#ff4444' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = dmgPercent > 100 ? 8 : 4;
        ctx.fillText(`${Math.round(dmgPercent)}%`, x + width / 2, y + height - 6);

        ctx.font = 'bold 11px Orbitron';
        ctx.fillStyle = player.color;
        ctx.shadowColor = player.glowColor;
        ctx.shadowBlur = 6;
        ctx.textAlign = dir === 1 ? 'left' : 'right';
        ctx.fillText(player.name, dir === 1 ? x : x + width, y - 5);

        if (player.weapon && player.weapon.name !== 'Fists') {
            ctx.font = '9px Orbitron';
            ctx.fillStyle = '#aaaaaa';
            ctx.shadowBlur = 0;
            ctx.fillText(player.weapon.name, dir === 1 ? x + 60 : x + width - 60, y - 5);
            if (player.weapon.ammo !== null) {
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`${player.weapon.ammo}`, dir === 1 ? x + 60 + ctx.measureText(player.weapon.name).width + 8 : x + width - 60 - 30, y - 5);
            }
        }

        ctx.restore();
    }

    drawSpecialMeters(ctx, p1, p2, y) {
        const meterWidth = 180;
        const meterHeight = 10;
        const padding = 30;

        this.drawSingleSpecialMeter(ctx, p1, padding, y, meterWidth, meterHeight, 1);
        if (p2) this.drawSingleSpecialMeter(ctx, p2, ctx.canvas.width - padding - meterWidth, y, meterWidth, meterHeight, -1);
    }

    drawSingleSpecialMeter(ctx, player, x, y, width, height, dir) {
        const meterPercent = Math.min(1, player.specialMeter / player.maxSpecialMeter);

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
            ctx.shadowBlur = 12;
        } else {
            const gradient = ctx.createLinearGradient(x, y, x + width, y);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#8b5cf6');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 0;
        }

        const fillX = dir === 1 ? x : x + width * (1 - meterPercent);
        ctx.fillRect(fillX, y + 1, width * meterPercent, height - 2);

        ctx.font = '8px Orbitron';
        ctx.fillStyle = meterPercent >= 1 ? '#FFD700' : '#888888';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(meterPercent >= 1 ? 'SPECIAL' : '', x + width / 2, y + 8);
        ctx.restore();
    }

    drawTimer(ctx, seconds, maxSeconds = 60) {
        const x = ctx.canvas.width / 2;
        const y = 40;

        ctx.save();
        ctx.font = 'bold 36px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (seconds <= 10 && seconds > 0) {
            const flash = Math.sin(Date.now() * 0.015) > 0;
            ctx.fillStyle = flash ? '#FF0000' : '#FF6666';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 20;
            const scale = flash ? 1.1 : 1.0;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillText(seconds.toString(), 0, 0);
            ctx.restore();
        } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#6366f1';
            ctx.shadowBlur = 10;
            ctx.fillText(seconds.toString(), x, y);
        }
        ctx.restore();
    }

    drawStocks(ctx, player, x, y, dir) {
        ctx.save();
        const stockSize = 12;
        const gap = 4;
        const totalWidth = player.stocks * (stockSize + gap) - gap;
        const startX = dir === 1 ? x : x - totalWidth;

        for (let i = 0; i < player.stocks; i++) {
            const sx = startX + i * (stockSize + gap);
            ctx.fillStyle = player.color;
            ctx.shadowColor = player.glowColor;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(sx + stockSize / 2, y + stockSize / 2, stockSize / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = player.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx + stockSize / 2, y + 2);
            ctx.lineTo(sx + stockSize / 2, y + stockSize - 2);
            ctx.moveTo(sx + 2, y + stockSize / 2 + 4);
            ctx.lineTo(sx + stockSize - 2, y + stockSize / 2 + 4);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawRoundWins(ctx, roundInfo) {
        if (!roundInfo) return;
        const { p1Wins, p2Wins, maxRounds } = roundInfo;
        const winsNeeded = Math.ceil(maxRounds / 2);
        const dotSize = 8;
        const dotSpacing = 16;
        const y = 62;

        ctx.save();
        for (let i = 0; i < winsNeeded; i++) {
            ctx.beginPath();
            ctx.arc(220 + i * dotSpacing, y, dotSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = i < p1Wins ? '#FF2D55' : '#333344';
            ctx.fill();
            ctx.strokeStyle = '#666688';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(ctx.canvas.width - 220 - i * dotSpacing, y, dotSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = i < p2Wins ? '#00B8FF' : '#333344';
            ctx.fill();
            ctx.strokeStyle = '#666688';
            ctx.stroke();
        }
        ctx.restore();
    }

    drawComboCounter(ctx, player, x, y) {
        if (player.comboCount < 2) return;

        ctx.save();
        let color, text;
        if (player.comboCount >= 12) { color = '#FF0000'; text = `COMBO x${player.comboCount}!`; }
        else if (player.comboCount >= 7) { color = '#FF8800'; text = `COMBO x${player.comboCount}`; }
        else { color = '#FFD700'; text = `COMBO x${player.comboCount}`; }

        const scale = 1 + Math.sin(Date.now() * 0.01) * 0.08;
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.font = 'bold 22px Orbitron';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }

    drawFloatingDamages(ctx) {
        for (const fd of this.floatingDamages) {
            ctx.save();
            ctx.globalAlpha = fd.alpha;
            ctx.font = `bold ${fd.size}px Orbitron`;
            ctx.fillStyle = fd.color;
            ctx.shadowColor = fd.color;
            ctx.shadowBlur = 8;
            ctx.textAlign = 'center';
            ctx.fillText(fd.text, fd.x, fd.y);
            ctx.restore();
        }
    }

    drawHitNumbers(ctx) {
        for (const hn of this.hitNumbers) {
            ctx.save();
            ctx.globalAlpha = hn.life / hn.maxLife;
            ctx.font = `bold ${hn.size}px Orbitron`;
            ctx.fillStyle = hn.color;
            ctx.shadowColor = hn.color;
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText(hn.damage.toString(), hn.x, hn.y);
            ctx.restore();
        }
    }

    drawWeaponIcon(ctx, player, cornerX, cornerY) {
        if (!player || !player.weapon) return;
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

    clear() {
        this.hitNumbers = [];
        this.floatingDamages = [];
        this.damageFlash = { p1: 0, p2: 0 };
        this.hpDisplay = { p1: 0, p2: 0 };
    }
}
