/**
 * Survival Vitals & Combat Damage Engine
 * Manages 20 Health (10 hearts), 20 Hunger (10 drumsticks), Oxygen bubbles,
 * Fall damage, Drowning, Starvation, Natural Regeneration, and Food Consumption.
 */

class SurvivalSystem {
  constructor(soundManager) {
    this.soundManager = soundManager;

    this.maxHealth = 20;
    this.health = 20;

    this.maxHunger = 20;
    this.hunger = 20;
    this.saturation = 5.0;

    this.maxOxygen = 20;
    this.oxygen = 20;

    // Experience & Levels
    this.exp = 0;
    this.level = 0;

    // Gamemode: 'survival' | 'creative'
    this.gameMode = 'survival';

    // Timers
    this.regenTimer = 0;
    this.starveTimer = 0;
    this.drownTimer = 0;

    // Fall tracking
    this.highestYSinceGrounded = 0;
    this.wasOnGround = true;

    // Damage flash red effect
    this.damageFlashTime = 0;
  }

  setGameMode(mode) {
    this.gameMode = mode.toLowerCase();
    console.log(`[Survival] Gamemode set to ${this.gameMode}`);
    if (this.gameMode === 'creative') {
      this.health = this.maxHealth;
      this.hunger = this.maxHunger;
      this.oxygen = this.maxOxygen;
      if (window.game && window.game.player) {
        window.game.player.canFly = true;
      }
    } else {
      if (window.game && window.game.player) {
        window.game.player.canFly = false;
        window.game.player.isFlying = false;
      }
    }
  }

  takeDamage(amount, sound = true, isArmorPiercing = false) {
    if (this.gameMode === 'creative') return;
    if (this.health <= 0) return;

    let finalDamage = amount;

    // Armor defense reduction (each point absorbs 4%, capped at 80%)
    if (!isArmorPiercing && window.game && window.game.inventory) {
      const defensePoints = window.game.inventory.getTotalArmorDefense();
      if (defensePoints > 0) {
        const reduction = Math.min(0.80, defensePoints * 0.04);
        finalDamage = Math.max(1, Math.round(amount * (1.0 - reduction)));
        window.game.inventory.damageArmor(1);
      }
    }

    this.health = Math.max(0, this.health - finalDamage);
    this.damageFlashTime = 0.35; // Red screen/damage flash

    if (sound && this.soundManager) {
      this.soundManager.playHurt(); // Classic Minecraft Oof! grunt
    }

    // Inform server of our damage
    if (window.game && window.game.multiplayer) {
      window.game.multiplayer.sendPlayerDamage(finalDamage);
    }

    if (this.health <= 0) {
      this.onDeath();
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  eatFood(foodItem) {
    if (!foodItem || !foodItem.food) return false;
    if (this.hunger >= this.maxHunger && this.gameMode !== 'creative') return false;

    this.hunger = Math.min(this.maxHunger, this.hunger + foodItem.food);
    this.saturation = Math.min(20, this.saturation + foodItem.food * 0.8);
    if (this.soundManager) {
      this.soundManager.playEat(); // Crunchy bite sound
      if (this.hunger >= this.maxHunger) {
        setTimeout(() => this.soundManager.playBurp(), 250);
      }
    }
    return true;
  }

  addExp(points) {
    this.exp += points;
    const expNeeded = (this.level + 1) * 7;
    while (this.exp >= expNeeded) {
      this.exp -= expNeeded;
      this.level++;
      if (this.soundManager && this.soundManager.playLevelUp) {
        this.soundManager.playLevelUp();
      }
    }
  }

  getExpProgress() {
    const expNeeded = (this.level + 1) * 7;
    return Math.min(1.0, this.exp / expNeeded);
  }

  onDeath() {
    console.log('Player died!');
    if (this.soundManager) {
      this.soundManager.playHurt();
    }
    // Respawn after short delay
    setTimeout(() => {
      this.health = this.maxHealth;
      this.hunger = this.maxHunger;
      this.oxygen = this.maxOxygen;
      if (window.game && window.game.player) {
        window.game.player.findSpawnPosition();
      }
    }, 1500);
  }

  update(dt, player) {
    if (this.damageFlashTime > 0) {
      this.damageFlashTime -= dt;
    }

    if (this.gameMode === 'creative') {
      this.health = this.maxHealth;
      this.hunger = this.maxHunger;
      this.oxygen = this.maxOxygen;
      return;
    }

    // 1. Oxygen & Drowning
    if (player.isInWater) {
      this.oxygen = Math.max(0, this.oxygen - dt * 2.5); // ~8s of breath
      if (this.oxygen <= 0) {
        this.drownTimer += dt;
        if (this.drownTimer >= 1.0) {
          this.drownTimer = 0;
          this.takeDamage(2, true, true); // 1 heart drowning damage (armor piercing)
        }
      }
    } else {
      this.oxygen = Math.min(this.maxOxygen, this.oxygen + dt * 10.0);
      this.drownTimer = 0;
    }

    // 2. Fall Damage
    if (player.onGround) {
      if (!this.wasOnGround && !player.isFlying && !player.isInWater) {
        const fallDist = this.highestYSinceGrounded - player.position.y;
        if (fallDist > 3.5) {
          const damage = Math.floor(fallDist - 3.0);
          this.takeDamage(damage, true, true); // Fall damage bypasses armor in classic MC
        }
      }
      this.wasOnGround = true;
      this.highestYSinceGrounded = player.position.y;
    } else {
      this.wasOnGround = false;
      if (player.position.y > this.highestYSinceGrounded) {
        this.highestYSinceGrounded = player.position.y;
      }
    }

    // 3. Hunger Depletion from moving / jumping
    const isMoving = Math.hypot(player.velocity.x, player.velocity.z) > 0.5;
    if (isMoving) {
      const rate = player.isSprinting ? 0.08 : 0.02;
      this.saturation -= rate * dt;
      if (this.saturation < 0) {
        this.hunger = Math.max(0, this.hunger - 0.05 * dt);
        this.saturation = 0;
      }
    }

    // 4. Natural Health Regeneration (when hunger >= 18)
    if (this.hunger >= 18 && this.health < this.maxHealth) {
      this.regenTimer += dt;
      if (this.regenTimer >= 4.0) {
        this.regenTimer = 0;
        this.heal(1);
        this.hunger = Math.max(0, this.hunger - 0.5);
      }
    } else {
      this.regenTimer = 0;
    }

    // 5. Starvation Damage (when hunger = 0)
    if (this.hunger <= 0 && this.health > 1) {
      this.starveTimer += dt;
      if (this.starveTimer >= 4.0) {
        this.starveTimer = 0;
        this.takeDamage(1, true, true);
      }
    } else {
      this.starveTimer = 0;
    }
  }
}

