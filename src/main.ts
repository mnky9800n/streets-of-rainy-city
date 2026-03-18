import './style.css'
import kaplay from 'kaplay'
import type {
    GameObj,
    PosComp,
    RectComp,
    ColorComp,
    ZComp,
    OpacityComp,
    AnchorComp,
} from 'kaplay'
import { PLAYER_1, SYSTEM } from '@rcade/plugin-input-classic'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_W = 336
const CANVAS_H = 262

const STREET_Y_TOP    = 165
const STREET_Y_BOTTOM = 252

const PLAYER_SPEED    = 80
const PLAYER_W        = 18
const PLAYER_H        = 30
const PLAYER_MAX_HP   = 200
const JUMP_VELOCITY   = -260
const GRAVITY         = 600

const PUNCH_REACH        = 36
const PUNCH_DURATION     = 0.18
const COMBO_WINDOW       = 0.45
const KNOCKBACK_SPEED    = 250
const KNOCKBACK_DURATION = 0.35
const HIT_FLASH_DURATION = 0.12

const POWER_UP_DURATION    = 6.0   // seconds the power-up lasts
const POWER_UP_COOLDOWN    = 18.0  // seconds before it can be used again
const POWER_UP_WINDOW      = 0.1   // seconds within which both buttons must be pressed
const POWER_UP_DAMAGE_MULT = 2     // damage multiplier while powered up

const ENEMY_W              = 18
const ENEMY_H              = 28
const ENEMY_SPEED          = 42
const ENEMY_MAX_HP         = 30
const ENEMY_PUNCH_REACH    = 28
const ENEMY_PUNCH_COOLDOWN = 1.8
const ENEMY_PUNCH_DAMAGE   = 10
const ENEMY_AGGRO_RANGE    = 160

const BOSS_MAX_HP          = 200
const BOSS_SPEED           = 75
const BOSS_PUNCH_REACH     = 40
const BOSS_PUNCH_COOLDOWN  = 1.2
const BOSS_PUNCH_DAMAGE    = 20
const BOSS_AGGRO_RANGE     = 200
const BOSS_SCALE           = (PLAYER_H * 4) / 256

const DELIVERY_SPEED       = 200   // fast - zooms across screen
const DELIVERY_DAMAGE      = 15
const DELIVERY_INTERVAL    = 10.8  // seconds between delivery enemies
const DELIVERY_SCALE       = (ENEMY_H * 3) / 256

const WORLD_SECTION_W = 336
const NUM_SECTIONS    = 5

const COL_PLAYER:        [number, number, number] = [52,  152, 219]
const COL_ENEMY:         [number, number, number] = [231, 76,  60]
const COL_POWER_UP_AURA: [number, number, number] = [80,  160, 255]
const COL_STREET:    [number, number, number] = [80,  80,  80]
const COL_BUILDING:  [number, number, number] = [45,  45,  45]
const COL_SKY:       [number, number, number] = [20,  20,  40]
const COL_HIT_FLASH: [number, number, number] = [255, 255, 255]

// ---------------------------------------------------------------------------
// Shared game object types
// ---------------------------------------------------------------------------

/** A standard colored rect with world position. */
type RectObj = GameObj<RectComp & ColorComp & PosComp & AnchorComp & ZComp>

/** A rect that also supports opacity (used for shadows and dying enemies). */
type FadeRectObj = GameObj<RectComp & ColorComp & PosComp & AnchorComp & ZComp & OpacityComp>

// ---------------------------------------------------------------------------
// Kaplay init
// ---------------------------------------------------------------------------

const k = kaplay({
    width: CANVAS_W,
    height: CANVAS_H,
    root: document.querySelector<HTMLDivElement>('#app')!,
    background: [20, 20, 40],
    crisp: true,
    global: false,
    debug: false,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rgb(r: number, g: number, b: number) {
    return k.rgb(r, g, b)
}

function zFromY(y: number): number {
    return y
}

function playPunchSound(gender: 'female' | 'male') {
    const num = String(Math.floor(Math.random() * 16) + 1).padStart(2, '0')
    k.play(`punch-${gender}-${num}`)
}

// ---------------------------------------------------------------------------
// Asset loading
// ---------------------------------------------------------------------------

k.loadSprite('startscreen', '/startscreen.png')
k.loadSprite('bridgestreet-bg', '/bridgestreet/bridge-street-bg.png')
k.loadSound('titlemusic', '/Bridge Street Run.mp3')
k.loadSound('level1music', '/Bridge Street Run LEVEL 1.mp3')
k.loadSound('gameoversound', '/8d82b5_Sonic_Game_Over_Sound_Effect.mp3')

for (let i = 1; i <= 16; i++) {
    const num = String(i).padStart(2, '0')
    k.loadSound(`punch-female-${num}`, `/audiojungle-JlBqMz6C-boxing-punch-female-vocal-pack-2/boxing punch female vocal pack ${num}.wav`)
    k.loadSound(`punch-male-${num}`, `/audiojungle-qwdFkYwS-boxing-punch-male-vocal-pack-2/boxing punch  male vocal pack ${num}.wav`)
}

k.loadSprite('jennifer-idle', '/sprites/jennifer/jennifer-idle.png', {
    sliceX: 6,
    sliceY: 1,
    anims: {
        idle: { from: 0, to: 4, loop: true, speed: 6 },
    },
})

k.loadSprite('jennifer-walk', '/sprites/jennifer/jennifer-walk.png', {
    sliceX: 8,
    sliceY: 1,
    anims: {
        walk: { from: 0, to: 7, loop: true, speed: 10 },
    },
})

k.loadSprite('jennifer-punch', '/sprites/jennifer/jennifer-punch.png', {
    sliceX: 12,
    sliceY: 1,
    anims: {
        punch: { from: 0, to: 11, loop: false },
    },
})

k.loadSprite('jennifer-jump', '/sprites/jennifer/jennifer-jump.png', {
    sliceX: 4,
    sliceY: 1,
    anims: {
        jump: { from: 0, to: 3, loop: false },
    },
})

k.loadSprite('jennifer-jumpkick', '/sprites/jennifer/jennifer-jumpkick.png', {
    sliceX: 4,
    sliceY: 1,
    anims: {
        jumpkick: { from: 0, to: 3, loop: false },
    },
})

k.loadSprite('jennifer-hit', '/sprites/jennifer/jennifer-hit.png', {
    sliceX: 4,
    sliceY: 1,
    anims: {
        hit: { from: 0, to: 3, loop: false },
    },
})

k.loadSprite('jennifer-knockback', '/sprites/jennifer/jennifer-knockback.png', {
    sliceX: 6,
    sliceY: 1,
    anims: {
        knockback: { from: 0, to: 5, loop: false },
    },
})

k.loadSprite('jennifer-death', '/sprites/jennifer/jennifer-death.png', {
    sliceX: 8,
    sliceY: 1,
    anims: {
        death: { from: 0, to: 7, loop: false },
    },
})

// Enemy male sprites
k.loadSprite('enemy-male-idle', '/sprites/enemy-thug-male/enemy-thug-male-idle.png', {
    sliceX: 6, sliceY: 1,
    anims: { idle: { from: 0, to: 5, loop: true, speed: 6 } },
})
k.loadSprite('enemy-male-walk', '/sprites/enemy-thug-male/enemy-thug-male-walk.png', {
    sliceX: 8, sliceY: 1,
    anims: { walk: { from: 0, to: 7, loop: true, speed: 10 } },
})
k.loadSprite('enemy-male-punch', '/sprites/enemy-thug-male/enemy-thug-male-punch.png', {
    sliceX: 6, sliceY: 1,
    anims: { punch: { from: 0, to: 5, loop: false } },
})
k.loadSprite('enemy-male-hit', '/sprites/enemy-thug-male/enemy-thug-male-hit.png', {
    sliceX: 4, sliceY: 1,
    anims: { hit: { from: 0, to: 3, loop: false } },
})
k.loadSprite('enemy-male-knockback', '/sprites/enemy-thug-male/enemy-thug-male-knockback.png', {
    sliceX: 6, sliceY: 1,
    anims: { knockback: { from: 0, to: 5, loop: false } },
})
k.loadSprite('enemy-male-death', '/sprites/enemy-thug-male/enemy-thug-male-death.png', {
    sliceX: 8, sliceY: 1,
    anims: { death: { from: 0, to: 7, loop: false } },
})

// Enemy female sprites
k.loadSprite('enemy-female-idle', '/sprites/enemy-thug-female/enemy-thug-female-idle.png', {
    sliceX: 6, sliceY: 1,
    anims: { idle: { from: 0, to: 5, loop: true, speed: 6 } },
})
k.loadSprite('enemy-female-walk', '/sprites/enemy-thug-female/enemy-thug-female-walk.png', {
    sliceX: 8, sliceY: 1,
    anims: { walk: { from: 0, to: 7, loop: true, speed: 10 } },
})
k.loadSprite('enemy-female-punch', '/sprites/enemy-thug-female/enemy-thug-female-punch.png', {
    sliceX: 6, sliceY: 1,
    anims: { punch: { from: 0, to: 5, loop: false } },
})
k.loadSprite('enemy-female-hit', '/sprites/enemy-thug-female/enemy-thug-female-hit.png', {
    sliceX: 4, sliceY: 1,
    anims: { hit: { from: 0, to: 3, loop: false } },
})
k.loadSprite('enemy-female-knockback', '/sprites/enemy-thug-female/enemy-thug-female-knockback.png', {
    sliceX: 6, sliceY: 1,
    anims: { knockback: { from: 0, to: 5, loop: false } },
})
k.loadSprite('enemy-female-death', '/sprites/enemy-thug-female/enemy-thug-female-death.png', {
    sliceX: 8, sliceY: 1,
    anims: { death: { from: 0, to: 7, loop: false } },
})

// Delivery enemy (skellyboy bike rider)
k.loadSprite('delivery-ride', '/sprites/delivery-enemy/delivery-enemy-ride.png', {
    sliceX: 4, sliceY: 1,
    anims: { ride: { from: 0, to: 3, loop: true, speed: 8 } },
})

k.loadSprite('pizza', '/pizza.png')
k.loadSprite('keyfob', '/keyfob.jpg')

// Boss - Evil Angel
k.loadSprite('boss-walk', '/sprites/evil-angel/evil-angel-walk.png', {
    sliceX: 16, sliceY: 1,
    anims: { walk: { from: 0, to: 15, loop: true, speed: 8 } },
})

k.loadSprite('boss-flyattack', '/sprites/evil-angel/evil-angel-flyattack.png', {
    sliceX: 6, sliceY: 1,
    anims: { flyattack: { from: 0, to: 5, loop: true, speed: 10 } },
})

k.loadSprite('boss-landing', '/sprites/evil-angel/evil-angel-landing.png', {
    sliceX: 6, sliceY: 1,
    anims: { landing: { from: 0, to: 5, loop: false, speed: 8 } },
})

k.loadSprite('boss-death', '/sprites/evil-angel/evil-angel-death.png', {
    sliceX: 8, sliceY: 1,
    anims: { death: { from: 0, to: 7, loop: false, speed: 6 } },
})

// ---------------------------------------------------------------------------
// Title music state (persists across title ↔ intro attract loop)
// ---------------------------------------------------------------------------

let titleMusic: ReturnType<typeof k.play> | null = null
let level1Music: ReturnType<typeof k.play> | null = null

function stopTitleMusic() {
    if (titleMusic) {
        titleMusic.stop()
        titleMusic = null
    }
}

function stopLevel1Music() {
    if (level1Music) {
        level1Music.stop()
        level1Music = null
    }
}

// ---------------------------------------------------------------------------
// Title Scene
// ---------------------------------------------------------------------------

k.scene('title', () => {
    k.add([k.sprite('startscreen', { width: CANVAS_W, height: CANVAS_H }), k.pos(0, 0), k.fixed()])

    // Only start music if not already playing (persists through attract mode)
    if (!titleMusic || titleMusic.paused) {
        titleMusic = k.play('titlemusic')
    }

    // k.add([
    //     k.text('STREETS OF\nRAINY CITY', { size: 28, align: 'center' }),
    //     k.pos(CANVAS_W / 2, 60),
    //     k.anchor('center'),
    //     k.color(rgb(255, 220, 50)),
    //     k.fixed(),
    // ])

    // k.add([
    //     k.text('Evil cult. Kidnapped girlfriend.\nOnly kung-fu can save her!', { size: 7, align: 'center' }),
    //     k.pos(CANVAS_W / 2, 122),
    //     k.anchor('center'),
    //     k.color(rgb(200, 180, 180)),
    //     k.fixed(),
    // ])

    // k.add([
    //     k.text('Z/J = Punch   X/K = Jump\nArrows/WASD = Move', { size: 7, align: 'center' }),
    //     k.pos(CANVAS_W / 2, 148),
    //     k.anchor('center'),
    //     k.color(rgb(160, 160, 200)),
    //     k.fixed(),
    // ])

    const pressStart = k.add([
        k.text('PRESS START', { size: 25 }),
        k.pos(CANVAS_W / 2, 180),
        k.anchor('center'),
        k.color(rgb(217, 255, 0)),
        k.opacity(1),
        k.fixed(),
    ])

    let flashTimer = 0
    let visible = true
    let idleTimer = 0

    k.onUpdate(() => {
        const dt = k.dt()
        flashTimer += dt
        if (flashTimer > 0.5) {
            flashTimer = 0
            visible = !visible
            pressStart.opacity = visible ? 1 : 0
        }

        // After 10 seconds of no input, show attract mode (story crawl)
        idleTimer += dt
        if (idleTimer > 10) k.go('intro')

        if (SYSTEM.ONE_PLAYER) k.go('video')
    })

    // Any key press resets idle and starts the game
    k.onKeyPress('enter', () => k.go('video'))
    k.onKeyPress('space', () => k.go('video'))
})

// ---------------------------------------------------------------------------
// Video Scene (plays startvideo.mp4 after pressing start)
// ---------------------------------------------------------------------------

k.scene('video', () => {
    stopTitleMusic()

    // Black background while video loads
    k.add([k.rect(CANVAS_W, CANVAS_H), k.color(rgb(0, 0, 0)), k.pos(0, 0), k.fixed()])

    const canvas = document.querySelector('canvas')!
    const video = document.createElement('video')
    video.src = '/startvideo.mp4'
    video.playsInline = true
    video.style.position = 'absolute'
    video.style.top = canvas.offsetTop + 'px'
    video.style.left = canvas.offsetLeft + 'px'
    video.style.width = canvas.clientWidth + 'px'
    video.style.height = canvas.clientHeight + 'px'
    video.style.objectFit = 'cover'
    video.style.zIndex = '9999'
    canvas.parentElement!.appendChild(video)

    video.play()

    // When the video ends, clean up and go to level start
    video.addEventListener('ended', () => {
        video.remove()
        k.go('levelstart')
    })

    // Allow skipping with start/enter/space
    function skip() {
        video.pause()
        video.remove()
        k.go('levelstart')
    }

    k.onKeyPress('enter', skip)
    k.onKeyPress('space', skip)

    k.onUpdate(() => {
        if (SYSTEM.ONE_PLAYER) skip()
    })

    // Clean up if scene changes unexpectedly
    k.onSceneLeave(() => {
        video.remove()
    })
})

// ---------------------------------------------------------------------------
// Level Start Scene (Sonic-style level title card)
// ---------------------------------------------------------------------------

k.scene('levelstart', () => {
    // Start level 1 music
    level1Music = k.play('level1music')

    // Black background
    k.add([k.rect(CANVAS_W, CANVAS_H), k.color(rgb(0, 0, 0)), k.pos(0, 0), k.fixed()])

    // Level name slides in from the left
    const levelName = k.add([
        k.text('Bridge Street', { size: 28 }),
        k.pos(-300, CANVAS_H / 2 - 20),
        k.anchor('center'),
        k.color(rgb(255, 220, 50)),
        k.fixed(),
    ])

    // Subtitle slides in from the right
    const subtitle = k.add([
        k.text('Stage 1', { size: 12 }),
        k.pos(CANVAS_W + 200, CANVAS_H / 2 + 18),
        k.anchor('center'),
        k.color(rgb(200, 200, 220)),
        k.fixed(),
    ])

    // Horizontal divider line
    const divider = k.add([
        k.rect(0, 2),
        k.pos(CANVAS_W / 2, CANVAS_H / 2 + 2),
        k.anchor('center'),
        k.color(rgb(255, 220, 50)),
        k.fixed(),
    ])

    let timer = 0
    const SLIDE_DURATION = 0.5
    const HOLD_DURATION = 2.0
    const FADE_DURATION = 0.4
    const TOTAL = SLIDE_DURATION + HOLD_DURATION + FADE_DURATION

    k.onUpdate(() => {
        const dt = k.dt()
        timer += dt

        if (timer < SLIDE_DURATION) {
            // Slide in phase
            const t = timer / SLIDE_DURATION
            const ease = 1 - Math.pow(1 - t, 3) // ease-out cubic
            levelName.pos.x = -300 + (CANVAS_W / 2 + 300) * ease
            subtitle.pos.x = (CANVAS_W + 200) - (200 + CANVAS_W / 2) * ease
            divider.width = 200 * ease
        } else if (timer < SLIDE_DURATION + HOLD_DURATION) {
            // Hold phase — everything stays
            levelName.pos.x = CANVAS_W / 2
            subtitle.pos.x = CANVAS_W / 2
            divider.width = 200
        } else if (timer < TOTAL) {
            // Fade out phase
            const t = (timer - SLIDE_DURATION - HOLD_DURATION) / FADE_DURATION
            levelName.opacity = 1 - t
            subtitle.opacity = 1 - t
            divider.opacity = 1 - t
        } else {
            k.go('game')
        }
    })
})

// ---------------------------------------------------------------------------
// Intro Scene (story crawl)
// ---------------------------------------------------------------------------

k.scene('intro', () => {
    const INTRO_TEXT =
        'An evil satanic cult has kidnapped your ' +
        'girlfriend while you were out buying a pizza!\n\n' +
        // 'Taken to the pits of hell that have opened in the caverns beneath ' +
        // 'the city by the Followers of Baal, a new gang that has taken over ' +
        // 'crime across the city.\n\n' +
        'Your girlfriend will be\n' +
        'The Final Sacrifice!\n\n' +
        // 'satanic forces across rainy-city.com to conquer the lands and bring ' +
        // 'about eternal hell.\n\n' +
        'Only you, and your trusty kung-fu powers, can defeat them and save ' +
        'your girlfriend before the pizza gets cold!'

    const FONT_SIZE    = 15
    const TEXT_MARGIN  = 20
    const TEXT_W       = CANVAS_W - TEXT_MARGIN * 2
    const SCROLL_SPEED = 28  // pixels per second — slow enough to read comfortably

    // Dark background covering the whole canvas.
    k.add([k.rect(CANVAS_W, CANVAS_H), k.color(rgb(...COL_SKY)), k.pos(0, 0), k.fixed()])

    // Gradient overlay at the top so text fades in cleanly.
    k.add([
        k.rect(CANVAS_W, 36),
        k.color(rgb(...COL_SKY)),
        k.pos(0, 0),
        k.fixed(),
        k.z(10),
    ])

    // The crawl text object.  kaplay's width option handles word-wrapping.
    const crawl = k.add([
        k.text(INTRO_TEXT, { size: FONT_SIZE, width: TEXT_W, align: 'center' }),
        k.pos(TEXT_MARGIN, CANVAS_H),   // start just below the visible area
        k.color(rgb(220, 200, 200)),
        k.fixed(),
        k.z(5),
    ])

    // "PRESS START" hint at the bottom so the player knows they can skip.
    const hint = k.add([
        k.text('PRESS START', { size: 6, align: 'center' }),
        k.pos(CANVAS_W / 2, CANVAS_H - 10),
        k.anchor('bot'),
        k.color(rgb(120, 110, 110)),
        k.opacity(1),
        k.fixed(),
        k.z(11),
    ])

    let hintFlashTimer = 0
    let hintVisible    = true

    function goToTitle() { k.go('title') }

    k.onUpdate(() => {
        const dt = k.dt()

        // Scroll the text upward.
        crawl.pos.y -= SCROLL_SPEED * dt

        // Flash the skip hint.
        hintFlashTimer += dt
        if (hintFlashTimer > 0.6) {
            hintFlashTimer = 0
            hintVisible    = !hintVisible
            hint.opacity   = hintVisible ? 1 : 0
        }

        // Loop back to title once the text has fully scrolled off.
        if (crawl.pos.y + crawl.height < 0) goToTitle()

        // Pressing start returns to title.
        if (SYSTEM.ONE_PLAYER) goToTitle()
    })

    k.onKeyPress('enter', goToTitle)
    k.onKeyPress('space', goToTitle)
})

// ---------------------------------------------------------------------------
// Game Scene
// ---------------------------------------------------------------------------

k.scene('game', () => {

    const totalWorldW = CANVAS_W * NUM_SECTIONS

    // ------------------------------------------------------------------
    // World geometry (background image)
    // ------------------------------------------------------------------

    k.add([
        k.sprite('bridgestreet-bg', { width: totalWorldW, height: CANVAS_H }),
        k.pos(0, 0),
        k.z(0),
    ])

    // ------------------------------------------------------------------
    // HUD
    // ------------------------------------------------------------------

    k.add([k.rect(104, 12), k.color(rgb(40, 40, 40)), k.pos(8, 8), k.fixed(), k.z(100)])

    const hpBar = k.add([
        k.rect(100, 8),
        k.color(rgb(50, 200, 80)),
        k.pos(10, 10),
        k.fixed(),
        k.z(101),
    ])

    k.add([k.text('HP', { size: 7 }), k.pos(10, 10), k.color(rgb(255, 255, 255)), k.fixed(), k.z(102)])

    const waveLabel = k.add([
        k.text('WAVE 1', { size: 7 }),
        k.pos(CANVAS_W - 8, 10),
        k.anchor('topright'),
        k.color(rgb(255, 220, 80)),
        k.fixed(),
        k.z(102),
    ])

    // Power-up HUD: "POWER UP!" flashes in the top-centre while active.
    const powerUpLabel = k.add([
        k.text('POWER UP!', { size: 9 }),
        k.pos(CANVAS_W / 2, 10),
        k.anchor('top'),
        k.color(rgb(...COL_POWER_UP_AURA)),
        k.opacity(0),
        k.fixed(),
        k.z(102),
    ])

    // "READY" indicator shown when power-up is off cooldown but not yet active.
    const powerReadyLabel = k.add([
        k.text('PWR RDY', { size: 7 }),
        k.pos(CANVAS_W / 2, 10),
        k.anchor('top'),
        k.color(rgb(160, 200, 255)),
        k.opacity(1),
        k.fixed(),
        k.z(102),
    ])

    // ------------------------------------------------------------------
    // Wave definitions
    // ------------------------------------------------------------------

    interface WaveDef {
        sectionIndex: number
        count: number
        spawnXRange: [number, number]
    }

    const waves: WaveDef[] = [
        { sectionIndex: 0, count: 2, spawnXRange: [260, 320] },
        { sectionIndex: 1, count: 3, spawnXRange: [400, 550] },
        { sectionIndex: 2, count: 3, spawnXRange: [700, 820] },
        { sectionIndex: 3, count: 4, spawnXRange: [1010, 1150] },
    ]

    let currentWave = 0
    let goArrow: ReturnType<typeof k.add> | null = null
    let bossDefeated = false
    let bossIntroStarted = false
    let bossArenaLocked = false
    let bossArenaCamX = 0
    let bossArenaLeft = 0
    let bossArenaRight = 0
    let bossDeathX = 0
    let bossDeathY = 0

    // ------------------------------------------------------------------
    // Enemy type and factory
    // ------------------------------------------------------------------

    interface EnemyState {
        hp: number
        maxHp: number
        groundY: number
        knockback: boolean
        knockbackTimer: number
        knockbackDir: number
        punchCooldown: number
        hitFlash: boolean
        hitFlashTimer: number
        dying: boolean
        dyingTimer: number
        facingRight: boolean
        currentAnim: string
        variant: 'male' | 'female'
        isBoss: boolean
        flyAttackCooldown: number
        flyAttackActive: boolean
        flyAttackDir: number
    }

    interface Enemy {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body:   any
        shadow: FadeRectObj
        hpBg:   RectObj
        hpFg:   RectObj
        state:  EnemyState
        destroy(): void
    }

    let waveEnemies: Enemy[] = []

    function spawnEnemy(worldX: number, groundY: number): Enemy {
        const variant: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female'

        const state: EnemyState = {
            hp: ENEMY_MAX_HP,
            maxHp: ENEMY_MAX_HP,
            groundY,
            knockback: false,
            knockbackTimer: 0,
            knockbackDir: 1,
            punchCooldown: 1 + Math.random() * 0.5,
            hitFlash: false,
            hitFlashTimer: 0,
            dying: false,
            dyingTimer: 0,
            facingRight: false,
            currentAnim: 'idle',
            variant,
            isBoss: false,
            flyAttackCooldown: 0,
            flyAttackActive: false,
            flyAttackDir: 0,
        }

        const shadow = k.add([
            k.rect(ENEMY_W * 3 + 4, 5),
            k.color(rgb(0, 0, 0)),
            k.opacity(0.35),
            k.pos(worldX, groundY),
            k.anchor('center'),
            k.z(zFromY(groundY) - 1),
        ]) as FadeRectObj

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = k.add([
            k.sprite(`enemy-${variant}-idle`),
            k.scale(ENEMY_SCALE),
            k.opacity(1),
            k.pos(worldX, groundY),
            k.anchor('bot'),
            k.z(zFromY(groundY)),
        ]) as any
        body.play('idle')

        const hpBg = k.add([
            k.rect(ENEMY_W + 4, 4),
            k.color(rgb(60, 20, 20)),
            k.pos(worldX - 2, groundY - ENEMY_H * 3 - 4),
            k.anchor('botleft'),
            k.z(zFromY(groundY) + 1),
        ]) as RectObj

        const hpFg = k.add([
            k.rect(ENEMY_W, 3),
            k.color(rgb(220, 50, 50)),
            k.pos(worldX, groundY - ENEMY_H * 3 - 4),
            k.anchor('botleft'),
            k.z(zFromY(groundY) + 2),
        ]) as RectObj

        return {
            body, shadow, hpBg, hpFg, state,
            destroy() {
                body.destroy()
                shadow.destroy()
                hpBg.destroy()
                hpFg.destroy()
            },
        }
    }

    // ------------------------------------------------------------------
    // Player state
    // ------------------------------------------------------------------

    interface PlayerState {
        hp: number
        grounded: boolean
        velY: number
        groundY: number
        visualY: number

        comboCount: number
        comboTimer: number
        punchActive: boolean
        punchTimer: number
        punchDir: number

        jumping: boolean
        jumpKickUsed: boolean

        knockback: boolean
        knockbackTimer: number
        knockbackDir: number

        facingRight: boolean

        hitFlash: boolean
        hitFlashTimer: number

        powerUp: boolean
        powerUpTimer: number
        powerUpCooldown: number
        lastAPressTime: number
        lastBPressTime: number

        scrollLimitX: number

        currentAnim: string
    }

    const ps: PlayerState = {
        hp: PLAYER_MAX_HP,
        grounded: true,
        velY: 0,
        groundY: (STREET_Y_TOP + STREET_Y_BOTTOM) / 2,
        visualY: (STREET_Y_TOP + STREET_Y_BOTTOM) / 2,

        comboCount: 0,
        comboTimer: 0,
        punchActive: false,
        punchTimer: 0,
        punchDir: 1,

        jumping: false,
        jumpKickUsed: false,

        knockback: false,
        knockbackTimer: 0,
        knockbackDir: 1,

        facingRight: true,

        hitFlash: false,
        hitFlashTimer: 0,

        powerUp: false,
        powerUpTimer: 0,
        powerUpCooldown: 0,
        lastAPressTime: -999,
        lastBPressTime: -999,

        scrollLimitX: WORLD_SECTION_W - PLAYER_W,

        currentAnim: 'idle',
    }

    const playerShadow = k.add([
        k.rect(PLAYER_W + 4, 5),
        k.color(rgb(0, 0, 0)),
        k.opacity(0.35),
        k.pos(60, ps.groundY),
        k.anchor('center'),
        k.z(zFromY(ps.groundY) - 1),
    ]) as FadeRectObj

    // Blue flame effect during power-up — 3 pre-created rects that oscillate
    const flames: any[] = []
    for (let i = 0; i < 3; i++) {
        const flame = k.add([
            k.rect(6, 12 + i * 6),
            k.color(rgb(60 + i * 30, 140 + i * 20, 255)),
            k.opacity(0),
            k.pos(0, 0),
            k.anchor('bot'),
            k.z(0),
        ]) as any
        flames.push(flame)
    }
    let flameTime = 0

    // All sprite frames are 256px tall. Scale to 3x PLAYER_H (90px in-game).
    const JENNIFER_SCALE = (PLAYER_H * 3) / 256
    // Enemies scale to 3x ENEMY_H (84px in-game).
    const ENEMY_SCALE = (ENEMY_H * 3) / 256

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = k.add([
        k.sprite('jennifer-idle'),
        k.scale(JENNIFER_SCALE),
        k.pos(60, ps.groundY),
        k.anchor('bot'),
        k.z(zFromY(ps.groundY)),
    ]) as any

    player.play('idle')

    // ------------------------------------------------------------------
    // Wave management
    // ------------------------------------------------------------------

    function spawnWave(waveIndex: number) {
        const wave = waves[waveIndex]
        if (!wave) return

        waveEnemies = []
        for (let i = 0; i < wave.count; i++) {
            const wx = wave.spawnXRange[0] + Math.random() * (wave.spawnXRange[1] - wave.spawnXRange[0])
            const gy = STREET_Y_TOP + 20 + Math.random() * (STREET_Y_BOTTOM - STREET_Y_TOP - 25)
            waveEnemies.push(spawnEnemy(wx, gy))
        }

        ps.scrollLimitX = (wave.sectionIndex + 1) * WORLD_SECTION_W - PLAYER_W
        waveLabel.text = `WAVE ${waveIndex + 1}`
    }

    function showGoArrow() {
        if (goArrow) return
        goArrow = k.add([
            k.text('GO  \u2192', { size: 16 }),
            k.pos(CANVAS_W - 8, CANVAS_H / 2),
            k.anchor('right'),
            k.color(rgb(255, 220, 50)),
            k.fixed(),
            k.z(103),
        ])
    }

    function hideGoArrow() {
        if (goArrow) {
            goArrow.destroy()
            goArrow = null
        }
    }

    spawnWave(0)

    // ------------------------------------------------------------------
    // Delivery enemy (bike hazard that rides across screen)
    // ------------------------------------------------------------------

    let deliveryTimer = 8 + Math.random() * 4  // first one after 8-12 seconds

    // ------------------------------------------------------------------
    // Combat helpers
    // ------------------------------------------------------------------

    function performPunchHit(reach: number, dir: number, damage: number, isFinisher: boolean): boolean {
        const px = player.pos.x
        const py = ps.groundY
        let hitAny = false

        for (const enemy of waveEnemies) {
            if (enemy.state.dying) continue
            const ex  = enemy.body.pos.x
            const ey  = enemy.state.groundY
            const hit = dir > 0
                ? (ex > px && ex < px + reach)
                : (ex < px && ex > px - reach)
            if (hit && Math.abs(ey - py) < 32) {
                applyDamageToEnemy(enemy, damage, dir, isFinisher)
                hitAny = true
            }
        }
        return hitAny
    }

    function applyDamageToEnemy(enemy: Enemy, damage: number, dir: number, applyKnockback: boolean) {
        const es = enemy.state
        es.hp -= damage
        es.hitFlash = true
        es.hitFlashTimer = HIT_FLASH_DURATION
        enemy.body.color = rgb(...COL_HIT_FLASH)

        if (applyKnockback) {
            es.knockback = true
            es.knockbackTimer = KNOCKBACK_DURATION
            es.knockbackDir = dir
        }

        if (es.hp <= 0) {
            es.dying = true
            es.dyingTimer = es.isBoss ? 2.0 : 0.4
            // Drop dying enemies behind all living characters but above background
            enemy.body.z = 1
            enemy.shadow.z = 0.5
            if (es.isBoss) {
                enemy.body.use(k.sprite('boss-death'))
                enemy.body.use(k.scale(BOSS_SCALE))
                enemy.body.play('death')
                es.currentAnim = 'death'
            } else {
                // Switch to death sprite immediately so the animation plays during fade-out
                const prefix = `enemy-${es.variant}`
                enemy.body.use(k.sprite(`${prefix}-death`))
                enemy.body.use(k.scale(ENEMY_SCALE))
                enemy.body.play('death')
                es.currentAnim = 'death'
            }
        }
    }

    function hitPlayer(damage: number, knockbackDir: number) {
        ps.hp = Math.max(0, ps.hp - damage)
        ps.hitFlash = true
        ps.hitFlashTimer = HIT_FLASH_DURATION
        ps.knockback = true
        ps.knockbackTimer = KNOCKBACK_DURATION
        ps.knockbackDir = knockbackDir
    }

    // ------------------------------------------------------------------
    // Input edge detection
    // ------------------------------------------------------------------

    let prevA = false
    let prevB = false

    // ------------------------------------------------------------------
    // Main game loop
    // ------------------------------------------------------------------

    k.onUpdate(() => {
        const dt = k.dt()

        // Read inputs
        const pressedA = PLAYER_1.A && !prevA
        const pressedB = PLAYER_1.B && !prevB
        prevA = PLAYER_1.A
        prevB = PLAYER_1.B

        const up    = PLAYER_1.DPAD.up    || k.isKeyDown('up')    || k.isKeyDown('w')
        const down  = PLAYER_1.DPAD.down  || k.isKeyDown('down')  || k.isKeyDown('s')
        const left  = PLAYER_1.DPAD.left  || k.isKeyDown('left')  || k.isKeyDown('a')
        const right = PLAYER_1.DPAD.right || k.isKeyDown('right') || k.isKeyDown('d')
        let fireA = pressedA || k.isKeyPressed('z') || k.isKeyPressed('j')
        let fireB = pressedB || k.isKeyPressed('x') || k.isKeyPressed('k')

        // --- Power-up activation detection ---
        // Record the moment each button was last pressed so we can check
        // whether both were pressed within POWER_UP_WINDOW seconds of each other.
        const now = k.time()
        if (fireA) ps.lastAPressTime = now
        if (fireB) ps.lastBPressTime = now

        const simultaneousPress =
            (fireA && Math.abs(now - ps.lastBPressTime) <= POWER_UP_WINDOW) ||
            (fireB && Math.abs(now - ps.lastAPressTime) <= POWER_UP_WINDOW)

        if (simultaneousPress && !ps.powerUp && ps.powerUpCooldown <= 0) {
            ps.powerUp      = true
            ps.powerUpTimer = POWER_UP_DURATION
            // Consume both button presses so the frame's individual actions
            // (jump, punch) do not fire alongside the power-up activation.
            fireA = false
            fireB = false
            // Invalidate recorded press times to prevent immediate re-trigger.
            ps.lastAPressTime = -999
            ps.lastBPressTime = -999
        }

        // --- Power-up timer and cooldown ---
        if (ps.powerUp) {
            ps.powerUpTimer -= dt
            if (ps.powerUpTimer <= 0) {
                ps.powerUp        = false
                ps.powerUpCooldown = POWER_UP_COOLDOWN
            }
        } else if (ps.powerUpCooldown > 0) {
            ps.powerUpCooldown -= dt
        }

        // --- Blue flame effect ---
        if (ps.powerUp) {
            flameTime += dt
            for (let i = 0; i < flames.length; i++) {
                const f = flames[i]
                const speed = 5 + i * 2
                const xOff = Math.sin(flameTime * speed + i * 2) * (8 + i * 4)
                const yOff = Math.sin(flameTime * (speed + 1) + i) * 6
                f.pos.x = player.pos.x + xOff
                f.pos.y = ps.visualY - PLAYER_H * (0.5 + i * 0.4) + yOff
                f.opacity = 0.3 + 0.2 * Math.sin(flameTime * speed * 1.5 + i)
                f.z = player.z - 0.5
            }
        } else {
            for (const f of flames) f.opacity = 0
        }

        // --- Power-up HUD labels ---
        if (ps.powerUp) {
            const hudPulse = 0.6 + 0.4 * Math.sin(auraTime * 6)
            powerUpLabel.opacity    = hudPulse
            powerReadyLabel.opacity = 0
        } else {
            powerUpLabel.opacity    = 0
            powerReadyLabel.opacity = ps.powerUpCooldown <= 0 ? 1 : 0
        }

        // --- Player knockback ---
        if (ps.knockback) {
            ps.knockbackTimer -= dt
            player.pos.x -= ps.knockbackDir * KNOCKBACK_SPEED * dt
            if (ps.knockbackTimer <= 0) ps.knockback = false
        }

        // --- Player hit flash ---
        if (ps.hitFlash) {
            ps.hitFlashTimer -= dt
            if (ps.hitFlashTimer <= 0) {
                ps.hitFlash = false
            }
        }

        // --- Jump ---
        if (fireB && ps.grounded && !ps.knockback) {
            ps.velY = JUMP_VELOCITY
            ps.grounded = false
            ps.jumping = true
            ps.jumpKickUsed = false
        }

        if (!ps.grounded) {
            ps.velY += GRAVITY * dt
            ps.visualY += ps.velY * dt
            if (ps.visualY >= ps.groundY) {
                ps.visualY = ps.groundY
                ps.velY = 0
                ps.grounded = true
                ps.jumping = false
            }
        } else {
            ps.visualY = ps.groundY
        }

        // --- Combo/punch timing ---
        ps.comboTimer -= dt
        if (ps.comboTimer <= 0) ps.comboCount = 0

        if (ps.punchActive) {
            ps.punchTimer -= dt
            if (ps.punchTimer <= 0) {
                ps.punchActive = false
            }
        }

        // --- Initiate attack ---
        const dmgMult = ps.powerUp ? POWER_UP_DAMAGE_MULT : 1
        if (fireA && !ps.punchActive && !ps.knockback) {
            if (!ps.grounded && !ps.jumpKickUsed) {
                ps.jumpKickUsed = true
                ps.punchActive = true
                ps.punchTimer = PUNCH_DURATION * 1.5
                ps.punchDir = ps.facingRight ? 1 : -1
                if (performPunchHit(PUNCH_REACH * 1.3, ps.punchDir, 18 * dmgMult, true)) {
                    playPunchSound('female')
                }
            } else if (ps.grounded) {
                ps.comboCount = (ps.comboCount % 3) + 1
                ps.comboTimer = COMBO_WINDOW
                ps.punchActive = true
                ps.punchTimer = PUNCH_DURATION
                ps.punchDir = ps.facingRight ? 1 : -1
                const isFinisher = ps.comboCount === 3
                if (performPunchHit(PUNCH_REACH, ps.punchDir, (isFinisher ? 20 : 8) * dmgMult, isFinisher)) {
                    playPunchSound('female')
                }
            }
        }

        // --- Movement ---
        if (!ps.knockback) {
            let dx = 0
            let dy = 0

            if (!ps.punchActive) {
                if (left)  dx -= PLAYER_SPEED * dt
                if (right) dx += PLAYER_SPEED * dt
            }

            if (up)   dy -= PLAYER_SPEED * 0.6 * dt
            if (down) dy += PLAYER_SPEED * 0.6 * dt

            if (dx > 0) ps.facingRight = true
            if (dx < 0) ps.facingRight = false

            player.pos.x = Math.max(10, Math.min(ps.scrollLimitX, player.pos.x + dx))
            ps.groundY = Math.max(STREET_Y_TOP + 10, Math.min(STREET_Y_BOTTOM - 5, ps.groundY + dy))
        }

        // --- Sync visual positions ---
        player.pos.y = ps.visualY
        player.z = zFromY(ps.groundY)
        playerShadow.pos.x = player.pos.x
        playerShadow.pos.y = ps.groundY
        playerShadow.z = player.z - 1

        // --- Player animation ---
        {
            const isDead = ps.hp <= 0
            let nextAnim: string
            let nextSprite: string

            if (isDead) {
                nextAnim   = 'death'
                nextSprite = 'jennifer-death'
            } else if (ps.knockback) {
                nextAnim   = 'knockback'
                nextSprite = 'jennifer-knockback'
            } else if (ps.hitFlash) {
                nextAnim   = 'hit'
                nextSprite = 'jennifer-hit'
            } else if (ps.punchActive && !ps.grounded) {
                nextAnim   = 'jumpkick'
                nextSprite = 'jennifer-jumpkick'
            } else if (ps.punchActive) {
                nextAnim   = 'punch'
                nextSprite = 'jennifer-punch'
            } else if (!ps.grounded) {
                nextAnim   = 'jump'
                nextSprite = 'jennifer-jump'
            } else if (left || right || up || down) {
                nextAnim   = 'walk'
                nextSprite = 'jennifer-walk'
            } else {
                nextAnim   = 'idle'
                nextSprite = 'jennifer-idle'
            }

            if (nextAnim !== ps.currentAnim) {
                ps.currentAnim = nextAnim
                const scale = JENNIFER_SCALE
                player.use(k.sprite(nextSprite))
                player.use(k.scale(scale))
                player.play(nextAnim)
            }

            // Flip sprite to face correct direction
            player.flipX = !ps.facingRight
        }

        // --- Camera ---
        if (bossArenaLocked) {
            // Lock player within boss arena and freeze camera
            player.pos.x = Math.max(bossArenaLeft, Math.min(bossArenaRight, player.pos.x))
            k.camPos(k.vec2(bossArenaCamX, CANVAS_H / 2))
        } else {
            const camX = Math.max(CANVAS_W / 2, Math.min(totalWorldW - CANVAS_W / 2, player.pos.x))
            k.camPos(k.vec2(camX, CANVAS_H / 2))
        }

        // --- HP bar ---
        const hpFrac = Math.max(0, ps.hp / PLAYER_MAX_HP)
        hpBar.width = Math.round(100 * hpFrac)
        hpBar.color = hpFrac > 0.5
            ? rgb(50, 200, 80)
            : hpFrac > 0.25 ? rgb(220, 180, 0) : rgb(220, 50, 50)

        // --- Update enemies ---
        const livingEnemies = waveEnemies.filter(e => !e.state.dying)

        for (const enemy of waveEnemies) {
            const es = enemy.state

            if (es.dying) {
                const dyingDuration = es.isBoss ? 2.0 : 0.4
                es.dyingTimer -= dt
                enemy.shadow.opacity = 0
                if (es.dyingTimer <= 0) {
                    if (es.isBoss) {
                        bossDeathX = enemy.body.pos.x
                        bossDeathY = es.groundY
                        bossDefeated = true
                    }
                    enemy.destroy()
                }
                continue
            }

            if (es.knockback) {
                es.knockbackTimer -= dt
                enemy.body.pos.x += es.knockbackDir * KNOCKBACK_SPEED * dt
                if (es.knockbackTimer <= 0) es.knockback = false
            }

            if (es.hitFlash) {
                es.hitFlashTimer -= dt
                if (es.hitFlashTimer <= 0) {
                    es.hitFlash = false
                    enemy.body.color = rgb(255, 255, 255)  // reset tint to white (normal)
                }
            }

            const distX = Math.abs(enemy.body.pos.x - player.pos.x)
            const distY = Math.abs(es.groundY - ps.groundY)
            const aggroRange   = es.isBoss ? BOSS_AGGRO_RANGE   : ENEMY_AGGRO_RANGE
            const moveSpeed    = es.isBoss ? BOSS_SPEED          : ENEMY_SPEED
            const punchReach   = es.isBoss ? BOSS_PUNCH_REACH    : ENEMY_PUNCH_REACH
            const punchCooldownMax = es.isBoss ? BOSS_PUNCH_COOLDOWN : ENEMY_PUNCH_COOLDOWN
            const punchDamage  = es.isBoss ? BOSS_PUNCH_DAMAGE   : ENEMY_PUNCH_DAMAGE
            const inAggro = distX < aggroRange && distY < 60

            if (es.isBoss) {
                // --- Boss fly attack ---
                if (!es.flyAttackActive) {
                    es.flyAttackCooldown -= dt
                }

                if (es.flyAttackActive) {
                    // Flying across the screen
                    enemy.body.pos.x += es.flyAttackDir * 250 * dt
                    es.groundY = STREET_Y_TOP + 20
                    enemy.body.pos.y = es.groundY

                    // Damage player on contact
                    const fdx = Math.abs(enemy.body.pos.x - player.pos.x)
                    const fdy = Math.abs(es.groundY - ps.groundY)
                    if (fdx < 50 && fdy < 40 && !ps.knockback) {
                        hitPlayer(BOSS_PUNCH_DAMAGE, es.flyAttackDir)
                    }

                    // Past screen edge — reappear on opposite side at ground level
                    const pastRight = enemy.body.pos.x > bossArenaRight + 80
                    const pastLeft  = enemy.body.pos.x < bossArenaLeft - 80
                    if (pastRight || pastLeft) {
                        es.flyAttackActive = false
                        es.flyAttackCooldown = 6 + Math.random() * 4
                        // Place at opposite edge
                        enemy.body.pos.x = pastRight ? bossArenaLeft + 20 : bossArenaRight - 20
                        es.groundY = (STREET_Y_TOP + STREET_Y_BOTTOM) / 2
                        es.facingRight = player.pos.x > enemy.body.pos.x
                        // Switch to walk
                        enemy.body.use(k.sprite('boss-walk'))
                        enemy.body.use(k.scale(BOSS_SCALE))
                        enemy.body.play('walk')
                        es.currentAnim = 'walk'
                        enemy.body.flipX = es.facingRight
                    }
                } else if (es.flyAttackCooldown <= 0 && !es.flyAttackActive) {
                    // Launch fly attack
                    es.flyAttackActive = true
                    es.flyAttackDir = player.pos.x < enemy.body.pos.x ? -1 : 1
                    enemy.body.flipX = es.flyAttackDir < 0
                    enemy.body.use(k.sprite('boss-flyattack'))
                    enemy.body.use(k.scale(BOSS_SCALE))
                    enemy.body.play('flyattack')
                    es.currentAnim = 'flyattack'
                } else {
                    // Normal chase / punch AI (only when not in fly attack)
                    if (!es.knockback && inAggro) {
                        const dirX = player.pos.x > enemy.body.pos.x ? 1 : -1
                        const dirY = ps.groundY > es.groundY ? 1 : -1
                        es.facingRight = dirX > 0
                        enemy.body.pos.x += dirX * moveSpeed * dt
                        es.groundY += dirY * moveSpeed * 0.6 * dt
                        es.groundY = Math.max(STREET_Y_TOP + 10, Math.min(STREET_Y_BOTTOM - 5, es.groundY))
                    }
                }
            } else if (!es.knockback && inAggro) {
                const dirX = player.pos.x > enemy.body.pos.x ? 1 : -1
                const dirY = ps.groundY > es.groundY ? 1 : -1
                es.facingRight = dirX > 0
                enemy.body.pos.x += dirX * moveSpeed * dt
                es.groundY += dirY * moveSpeed * 0.6 * dt
                es.groundY = Math.max(STREET_Y_TOP + 10, Math.min(STREET_Y_BOTTOM - 5, es.groundY))
            }

            enemy.body.pos.y = es.groundY
            enemy.body.z = zFromY(es.groundY)
            enemy.shadow.pos.x = enemy.body.pos.x
            enemy.shadow.pos.y = es.groundY
            enemy.shadow.z = enemy.body.z - 1

            if (es.isBoss) {
                // Boss HP bar is wider and floats above the scaled-up sprite
                enemy.hpBg.pos.x = enemy.body.pos.x - 32
                enemy.hpBg.pos.y = es.groundY - PLAYER_H * 4 - 6
                enemy.hpFg.pos.x = enemy.body.pos.x - 30
                enemy.hpFg.pos.y = es.groundY - PLAYER_H * 4 - 6
                enemy.hpFg.width = Math.max(0, Math.round(60 * (es.hp / es.maxHp)))
            } else {
                enemy.hpBg.pos.x = enemy.body.pos.x - 2
                enemy.hpBg.pos.y = es.groundY - ENEMY_H * 3 - 4
                enemy.hpFg.pos.x = enemy.body.pos.x
                enemy.hpFg.pos.y = es.groundY - ENEMY_H * 3 - 4
                enemy.hpFg.width = Math.max(0, Math.round(ENEMY_W * (es.hp / es.maxHp)))
            }

            // --- Enemy animation ---
            // Note: dying enemies are handled by the early-exit block above (with continue),
            // so this block only runs for living enemies. The death anim is triggered in
            // applyDamageToEnemy at the moment es.dying becomes true.
            if (es.isBoss) {
                // While fly-attacking, keep the flyattack sprite; otherwise stay on walk.
                if (!es.flyAttackActive && es.currentAnim !== 'walk') {
                    es.currentAnim = 'walk'
                    enemy.body.use(k.sprite('boss-walk'))
                    enemy.body.use(k.scale(BOSS_SCALE))
                    enemy.body.play('walk')
                }
                // Boss walk sprite faces RIGHT (same as regular enemies).
                // During fly attack, flipX is set at launch time — don't override it here.
                if (!es.flyAttackActive) {
                    enemy.body.flipX = !es.facingRight
                }
            } else {
                const prefix = `enemy-${es.variant}`
                let nextAnim: string
                let nextSprite: string

                if (es.knockback) {
                    nextAnim   = 'knockback'
                    nextSprite = `${prefix}-knockback`
                } else if (es.hitFlash) {
                    nextAnim   = 'hit'
                    nextSprite = `${prefix}-hit`
                } else if (es.punchCooldown > ENEMY_PUNCH_COOLDOWN - 0.3 && es.punchCooldown <= ENEMY_PUNCH_COOLDOWN) {
                    nextAnim   = 'punch'
                    nextSprite = `${prefix}-punch`
                } else if (!es.knockback && inAggro) {
                    nextAnim   = 'walk'
                    nextSprite = `${prefix}-walk`
                } else {
                    nextAnim   = 'idle'
                    nextSprite = `${prefix}-idle`
                }

                if (nextAnim !== es.currentAnim) {
                    es.currentAnim = nextAnim
                    enemy.body.use(k.sprite(nextSprite))
                    enemy.body.use(k.scale(ENEMY_SCALE))
                    enemy.body.play(nextAnim)
                }

                // Flip sprite to face correct direction
                enemy.body.flipX = !es.facingRight
            }

            if (!es.flyAttackActive) {
                es.punchCooldown -= dt
                if (es.punchCooldown <= 0 && inAggro && distX < punchReach && distY < 20) {
                    es.punchCooldown = punchCooldownMax
                    if (!ps.knockback) {
                        hitPlayer(punchDamage, enemy.body.pos.x < player.pos.x ? 1 : -1)
                        playPunchSound(es.variant === 'female' ? 'female' : 'male')
                    }
                }
            }
        }

        // --- Boss victory — keyfob drop ---
        if (bossDefeated) {
            bossDefeated = false
            waveEnemies = []

            // Spawn keyfob that arcs out from boss death position
            const KEYFOB_SIZE = 32
            let keyfobVelX = (Math.random() < 0.5 ? 1 : -1) * 80
            let keyfobVelY = -200
            const keyfobGravity = 500
            const keyfobLandY = bossDeathY
            let keyfobLanded = false

            const keyfob = k.add([
                k.sprite('keyfob', { width: KEYFOB_SIZE, height: Math.round(KEYFOB_SIZE * 180 / 476) }),
                k.pos(bossDeathX, bossDeathY - 40),
                k.anchor('bot'),
                k.z(zFromY(bossDeathY) + 0.5),
            ]) as any

            const keyfobUpdate = k.onUpdate(() => {
                const kdt = k.dt()

                if (!keyfobLanded) {
                    keyfobVelY += keyfobGravity * kdt
                    keyfob.pos.x += keyfobVelX * kdt
                    keyfob.pos.y += keyfobVelY * kdt
                    if (keyfob.pos.y >= keyfobLandY) {
                        keyfob.pos.y = keyfobLandY
                        keyfobLanded = true
                    }
                }

                // Pickup collision
                const kdx = Math.abs(keyfob.pos.x - player.pos.x)
                const kdy = Math.abs(keyfobLandY - ps.groundY)
                if (keyfobLanded && kdx < 24 && kdy < 24) {
                    keyfob.destroy()
                    keyfobUpdate.cancel()
                    showKeyfobPickup()
                }
            })
        }

        function showKeyfobPickup() {
            // Dialogue box
            const dialogBg = k.add([
                k.rect(CANVAS_W - 20, 100),
                k.color(rgb(10, 10, 30)),
                k.opacity(0.9),
                k.pos(CANVAS_W / 2, CANVAS_H / 2),
                k.anchor('center'),
                k.fixed(),
                k.z(400),
            ])

            // Keyfob image
            const keyfobImg = k.add([
                k.sprite('keyfob', { width: 100, height: 38 }),
                k.pos(60, CANVAS_H / 2),
                k.anchor('center'),
                k.fixed(),
                k.z(401),
            ])

            // Text
            const pickupText = k.add([
                k.text("You got Walter's\nRC key!", { size: 16 }),
                k.pos(130, CANVAS_H / 2 - 20),
                k.color(rgb(255, 255, 100)),
                k.fixed(),
                k.z(401),
            ])

            // Press start prompt
            const prompt = k.add([
                k.text('PRESS START', { size: 10 }),
                k.pos(CANVAS_W - 20, CANVAS_H / 2 + 38),
                k.anchor('right'),
                k.color(rgb(200, 200, 200)),
                k.opacity(1),
                k.fixed(),
                k.z(401),
            ])

            let pFlash = 0
            let pVisible = true
            const pSub = k.onUpdate(() => {
                pFlash += k.dt()
                if (pFlash > 0.4) {
                    pFlash = 0
                    pVisible = !pVisible
                    prompt.opacity = pVisible ? 1 : 0
                }
            })

            let dismissed = false
            function dismiss() {
                if (dismissed) return
                dismissed = true
                dialogBg.destroy()
                keyfobImg.destroy()
                pickupText.destroy()
                prompt.destroy()
                pSub.cancel()
                enterK.cancel()
                spaceK.cancel()
                zK.cancel()
                jK.cancel()
                rcadeSub.cancel()
                fadeToEndVideo()
            }

            const enterK = k.onKeyPress('enter', dismiss)
            const spaceK = k.onKeyPress('space', dismiss)
            const zK = k.onKeyPress('z', dismiss)
            const jK = k.onKeyPress('j', dismiss)
            const rcadeSub = k.onUpdate(() => {
                if (SYSTEM.ONE_PLAYER || PLAYER_1.A || PLAYER_1.B) dismiss()
            })
        }

        function fadeToEndVideo() {
            // Fade to black
            const blackOverlay = k.add([
                k.rect(CANVAS_W, CANVAS_H),
                k.color(rgb(0, 0, 0)),
                k.opacity(0),
                k.pos(0, 0),
                k.fixed(),
                k.z(500),
            ])

            let fadeTimer = 0
            const FADE_DURATION = 1.0

            const fadeSub = k.onUpdate(() => {
                fadeTimer += k.dt()
                blackOverlay.opacity = Math.min(1, fadeTimer / FADE_DURATION)
                if (fadeTimer >= FADE_DURATION) {
                    fadeSub.cancel()
                    k.go('endvideo')
                }
            })
        }

        // --- Wave completion ---
        if (livingEnemies.length === 0 && waveEnemies.length > 0 && currentWave < waves.length) {
            const nextIndex = currentWave + 1

            if (nextIndex < waves.length) {
                ps.scrollLimitX = (waves[nextIndex].sectionIndex + 1) * WORLD_SECTION_W - PLAYER_W
                showGoArrow()
                currentWave = nextIndex
                waveEnemies = []

                const triggerX = waves[currentWave].sectionIndex * WORLD_SECTION_W + 40
                const sub = k.onUpdate(() => {
                    if (player.pos.x > triggerX) {
                        hideGoArrow()
                        spawnWave(currentWave)
                        sub.cancel()
                    }
                })
            } else if (!bossIntroStarted) {
                // Final wave cleared — boss intro sequence
                bossIntroStarted = true
                currentWave = waves.length
                waveEnemies = []
                ps.scrollLimitX = totalWorldW

                // "GO GO GO →" flashing text
                const goText = k.add([
                    k.text('GO GO GO  \u2192', { size: 20 }),
                    k.pos(CANVAS_W / 2, CANVAS_H / 2),
                    k.anchor('center'),
                    k.color(rgb(255, 220, 50)),
                    k.fixed(),
                    k.z(103),
                ])
                let goFlash = 0
                let goVisible = true
                const goFlashSub = k.onUpdate(() => {
                    goFlash += k.dt()
                    if (goFlash > 0.3) {
                        goFlash = 0
                        goVisible = !goVisible
                        goText.opacity = goVisible ? 1 : 0
                    }
                })

                // Wait for player to walk one screen width right, then lock camera and start boss intro
                const bossAreaX = player.pos.x + CANVAS_W
                const triggerSub = k.onUpdate(() => {
                    if (player.pos.x > bossAreaX) {
                        goText.destroy()
                        goFlashSub.cancel()
                        triggerSub.cancel()
                        // Lock scroll so player can't leave the boss arena
                        ps.scrollLimitX = player.pos.x + CANVAS_W / 2
                        const worldBossX = k.camPos().x
                        const bossLandY = (STREET_Y_TOP + STREET_Y_BOTTOM) / 2
                        showBossDialogue(worldBossX, bossLandY)
                    }
                })
            }
        }

        function showBossDialogue(
            bossLandX: number,
            bossLandY: number,
        ) {
            // Dialogue box background
            const dialogBg = k.add([
                k.rect(CANVAS_W - 20, 100),
                k.color(rgb(10, 0, 20)),
                k.opacity(0.9),
                k.pos(CANVAS_W / 2, CANVAS_H - 55),
                k.anchor('center'),
                k.fixed(),
                k.z(400),
            ])

            // Boss face portrait (use first frame of walk sheet)
            const portrait = k.add([
                k.sprite('boss-walk'),
                k.scale(0.3),
                k.pos(20, CANVAS_H - 100),
                k.anchor('botleft'),
                k.fixed(),
                k.z(401),
            ]) as any

            // Dialogue text
            const dialogText = k.add([
                k.text('"You will never stop\nTHE FINAL SACRIFICE!"', { size: 14, width: CANVAS_W - 120 }),
                k.pos(110, CANVAS_H - 95),
                k.color(rgb(255, 200, 255)),
                k.fixed(),
                k.z(401),
            ])

            // "PRESS START" prompt
            const prompt = k.add([
                k.text('PRESS START', { size: 10 }),
                k.pos(CANVAS_W - 20, CANVAS_H - 12),
                k.anchor('right'),
                k.color(rgb(200, 200, 200)),
                k.opacity(1),
                k.fixed(),
                k.z(401),
            ])

            let promptFlash = 0
            let promptVisible = true
            const promptSub = k.onUpdate(() => {
                promptFlash += k.dt()
                if (promptFlash > 0.4) {
                    promptFlash = 0
                    promptVisible = !promptVisible
                    prompt.opacity = promptVisible ? 1 : 0
                }
            })

            let dismissed = false
            function dismissDialogue() {
                if (dismissed) return
                dismissed = true
                dialogBg.destroy()
                portrait.destroy()
                dialogText.destroy()
                prompt.destroy()
                promptSub.cancel()
                enterSub.cancel()
                spaceSub.cancel()
                zSub.cancel()
                jSub.cancel()
                rcadeDismissSub.cancel()
                spawnBoss(bossLandX, bossLandY)
            }

            const enterSub = k.onKeyPress('enter', dismissDialogue)
            const spaceSub = k.onKeyPress('space', dismissDialogue)
            const zSub = k.onKeyPress('z', dismissDialogue)
            const jSub = k.onKeyPress('j', dismissDialogue)
            const rcadeDismissSub = k.onUpdate(() => {
                if (SYSTEM.ONE_PLAYER || PLAYER_1.A || PLAYER_1.B) dismissDialogue()
            })
        }

        function spawnBoss(bossX: number, bossY: number) {
            // Lock the screen to the boss arena
            const cam = k.camPos()
            bossArenaLocked = true
            bossArenaCamX = cam.x
            bossArenaLeft = cam.x - CANVAS_W / 2 + 10
            bossArenaRight = cam.x + CANVAS_W / 2 - 10

            const bossState: EnemyState = {
                hp: BOSS_MAX_HP,
                maxHp: BOSS_MAX_HP,
                groundY: bossY,
                knockback: false,
                knockbackTimer: 0,
                knockbackDir: 1,
                punchCooldown: 2,
                hitFlash: false,
                hitFlashTimer: 0,
                dying: false,
                dyingTimer: 0,
                facingRight: false,
                currentAnim: 'walk',
                variant: 'male',
                isBoss: true,
                flyAttackCooldown: 8,
                flyAttackActive: false,
                flyAttackDir: -1,
            }

            const bossShadow = k.add([
                k.rect(PLAYER_W * 4 + 4, 5),
                k.color(rgb(0, 0, 0)),
                k.opacity(0.35),
                k.pos(bossX, bossY),
                k.anchor('center'),
                k.z(zFromY(bossY) - 1),
            ]) as FadeRectObj

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bossBody = k.add([
                k.sprite('boss-walk'),
                k.scale(BOSS_SCALE),
                k.opacity(1),
                k.pos(bossX, bossY),
                k.anchor('bot'),
                k.z(zFromY(bossY)),
            ]) as any
            bossBody.play('walk')

            const bossHpBg = k.add([
                k.rect(64, 6),
                k.color(rgb(60, 20, 60)),
                k.pos(bossX - 32, bossY - PLAYER_H * 4 - 6),
                k.anchor('botleft'),
                k.z(zFromY(bossY) + 1),
            ]) as RectObj

            const bossHpFg = k.add([
                k.rect(60, 4),
                k.color(rgb(200, 0, 200)),
                k.pos(bossX - 30, bossY - PLAYER_H * 4 - 6),
                k.anchor('botleft'),
                k.z(zFromY(bossY) + 2),
            ]) as RectObj

            const bossEnemy: Enemy = {
                body: bossBody,
                shadow: bossShadow,
                hpBg: bossHpBg,
                hpFg: bossHpFg,
                state: bossState,
                destroy() {
                    bossBody.destroy()
                    bossShadow.destroy()
                    bossHpBg.destroy()
                    bossHpFg.destroy()
                },
            }

            waveEnemies = [bossEnemy]
            waveLabel.text = 'BOSS'
        }

        // --- Delivery enemy ---
        deliveryTimer -= dt
        if (deliveryTimer <= 0) {
            deliveryTimer = DELIVERY_INTERVAL + Math.random() * 5

            // Pick a random Y on the street
            const deliveryY = STREET_Y_TOP + 15 + Math.random() * (STREET_Y_BOTTOM - STREET_Y_TOP - 20)

            // Spawn from the right side of the visible screen, ride left
            // The sprite faces LEFT already so no flip needed
            const startX = k.camPos().x + CANVAS_W / 2 + 50

            const biker = k.add([
                k.sprite('delivery-ride'),
                k.scale(DELIVERY_SCALE),
                k.pos(startX, deliveryY),
                k.anchor('bot'),
                k.z(zFromY(deliveryY)),
                k.opacity(1),
            ]) as any
            biker.play('ride')

            // Drop a pizza at a random point along the ride
            let pizzaDropped = false
            // Drop pizza somewhere in the visible screen area
            const camLeft = k.camPos().x - CANVAS_W / 2
            const pizzaDropX = camLeft + CANVAS_W * 0.2 + Math.random() * CANVAS_W * 0.6

            const bikerUpdate = k.onUpdate(() => {
                biker.pos.x -= DELIVERY_SPEED * k.dt()

                // Drop pizza as biker passes the drop point — arcs off the back
                if (!pizzaDropped && biker.pos.x <= pizzaDropX) {
                    pizzaDropped = true
                    const PIZZA_SIZE = 48
                    const landY = deliveryY
                    let pizzaVelX = 60     // drifts right (off the back)
                    let pizzaVelY = -180   // launches upward
                    const pizzaGravity = 500
                    let pizzaLanded = false

                    const pizzaBox = k.add([
                        k.sprite('pizza', { width: PIZZA_SIZE, height: PIZZA_SIZE }),
                        k.pos(biker.pos.x, deliveryY - 30),
                        k.anchor('bot'),
                        k.z(zFromY(deliveryY) + 0.5),
                    ]) as any

                    const pizzaUpdate = k.onUpdate(() => {
                        const pdt = k.dt()

                        // Arc physics until landed
                        if (!pizzaLanded) {
                            pizzaVelY += pizzaGravity * pdt
                            pizzaBox.pos.x += pizzaVelX * pdt
                            pizzaBox.pos.y += pizzaVelY * pdt
                            if (pizzaBox.pos.y >= landY) {
                                pizzaBox.pos.y = landY
                                pizzaLanded = true
                            }
                        }

                        // Pickup collision
                        const pdx = Math.abs(pizzaBox.pos.x - player.pos.x)
                        const pdy = Math.abs(landY - ps.groundY)
                        if (pdx < 24 && pdy < 24) {
                            ps.hp = Math.min(PLAYER_MAX_HP, ps.hp + PLAYER_MAX_HP * 0.2)
                            pizzaBox.destroy()
                            pizzaUpdate.cancel()
                        }
                    })
                }

                // Check collision with player
                const dx = Math.abs(biker.pos.x - player.pos.x)
                const dy = Math.abs(deliveryY - ps.groundY)
                if (dx < 30 && dy < 20 && !ps.knockback) {
                    hitPlayer(DELIVERY_DAMAGE, biker.pos.x < player.pos.x ? 1 : -1)
                }

                // Remove when off screen to the left
                if (biker.pos.x < k.camPos().x - CANVAS_W / 2 - 100) {
                    biker.destroy()
                    bikerUpdate.cancel()
                }
            })
        }

        // --- Game over ---
        if (ps.hp <= 0) k.go('deathvideo')
    })
})

// ---------------------------------------------------------------------------
// Game Over Scene
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Death Video Scene (plays death.mp4 before game over screen)
// ---------------------------------------------------------------------------

k.scene('deathvideo', () => {
    stopLevel1Music()

    k.add([k.rect(CANVAS_W, CANVAS_H), k.color(rgb(0, 0, 0)), k.pos(0, 0), k.fixed()])

    const canvas = document.querySelector('canvas')!
    const video = document.createElement('video')
    video.src = '/death.mp4'
    video.playsInline = true
    video.style.position = 'absolute'
    video.style.top = canvas.offsetTop + 'px'
    video.style.left = canvas.offsetLeft + 'px'
    video.style.width = canvas.clientWidth + 'px'
    video.style.height = canvas.clientHeight + 'px'
    video.style.objectFit = 'cover'
    video.style.zIndex = '9999'
    video.style.opacity = '0'
    video.style.transition = 'opacity 1s ease-in'
    canvas.parentElement!.appendChild(video)

    video.play()
    requestAnimationFrame(() => { video.style.opacity = '1' })

    video.addEventListener('ended', () => {
        video.remove()
        k.go('gameover')
    })

    function skip() {
        video.pause()
        video.remove()
        k.go('gameover')
    }

    k.onKeyPress('enter', skip)
    k.onKeyPress('space', skip)

    k.onUpdate(() => {
        if (SYSTEM.ONE_PLAYER) skip()
    })

    k.onSceneLeave(() => {
        video.remove()
    })
})

// ---------------------------------------------------------------------------
// Game Over Scene
// ---------------------------------------------------------------------------

k.scene('gameover', () => {
    stopLevel1Music()
    let gameOverSound: ReturnType<typeof k.play> | null = null
    k.wait(0.5, () => { gameOverSound = k.play('gameoversound') })

    function stopGameOverSound() {
        if (gameOverSound) {
            gameOverSound.stop()
            gameOverSound = null
        }
    }

    k.add([k.rect(CANVAS_W, CANVAS_H), k.color(rgb(10, 0, 0)), k.pos(0, 0), k.fixed()])

    k.add([
        k.text('GAME OVER', { size: 32 }),
        k.pos(CANVAS_W / 2, 85),
        k.anchor('center'),
        k.color(rgb(220, 50, 50)),
        k.fixed(),
    ])

    k.add([
        k.text('Your girlfriend awaits...', { size: 14 }),
        k.pos(CANVAS_W / 2, 140),
        k.anchor('center'),
        k.color(rgb(180, 160, 160)),
        k.fixed(),
    ])

    k.add([
        k.text('And the pizza is getting cold.', { size: 14 }),
        k.pos(CANVAS_W / 2, 162),
        k.anchor('center'),
        k.color(rgb(180, 160, 160)),
        k.fixed(),
    ])

    const retry = k.add([
        k.text('PRESS START TO RETRY', { size: 10 }),
        k.pos(CANVAS_W / 2, 195),
        k.anchor('center'),
        k.color(rgb(255, 255, 255)),
        k.opacity(1),
        k.fixed(),
    ])

    let flashTimer = 0
    let visible = true

    k.onUpdate(() => {
        flashTimer += k.dt()
        if (flashTimer > 0.5) {
            flashTimer = 0
            visible = !visible
            retry.opacity = visible ? 1 : 0
        }
        if (SYSTEM.ONE_PLAYER) { stopGameOverSound(); k.go('title') }
    })

    k.onKeyPress('enter', () => { stopGameOverSound(); k.go('title') })
    k.onKeyPress('space', () => { stopGameOverSound(); k.go('title') })
})

// ---------------------------------------------------------------------------
// Victory Scene
// ---------------------------------------------------------------------------

k.scene('endvideo', () => {
    stopLevel1Music()

    k.add([k.rect(CANVAS_W, CANVAS_H), k.color(rgb(0, 0, 0)), k.pos(0, 0), k.fixed()])

    const canvas = document.querySelector('canvas')!
    const video = document.createElement('video')
    video.src = '/level1-end.mp4'
    video.playsInline = true
    video.style.position = 'absolute'
    video.style.top = canvas.offsetTop + 'px'
    video.style.left = canvas.offsetLeft + 'px'
    video.style.width = canvas.clientWidth + 'px'
    video.style.height = canvas.clientHeight + 'px'
    video.style.objectFit = 'cover'
    video.style.zIndex = '9999'
    canvas.parentElement!.appendChild(video)

    video.play()

    video.addEventListener('ended', () => {
        video.remove()
        k.go('victory')
    })

    function skip() {
        video.pause()
        video.remove()
        k.go('victory')
    }

    k.onKeyPress('enter', skip)
    k.onKeyPress('space', skip)

    k.onUpdate(() => {
        if (SYSTEM.ONE_PLAYER) skip()
    })

    k.onSceneLeave(() => {
        video.remove()
    })
})

// ---------------------------------------------------------------------------
// Victory Scene
// ---------------------------------------------------------------------------

k.scene('victory', () => {
    stopLevel1Music()

    k.add([k.rect(CANVAS_W, CANVAS_H), k.color(rgb(10, 0, 20)), k.pos(0, 0), k.fixed()])

    k.add([
        k.text('This is SHAREWARE', { size: 22 }),
        k.pos(CANVAS_W / 2, 50),
        k.anchor('center'),
        k.color(rgb(200, 0, 255)),
        k.fixed(),
    ])

    k.add([
        k.text('If you want to play new\nlevels, mail 5$ check or\nmoney order to the address\nfound in the manual.', { size: 12, width: CANVAS_W - 40, align: 'center' }),
        k.pos(CANVAS_W / 2, 100),
        k.anchor('center'),
        k.color(rgb(220, 200, 255)),
        k.fixed(),
    ])

    const cont = k.add([
        k.text('PRESS START', { size: 10 }),
        k.pos(CANVAS_W / 2, 200),
        k.anchor('center'),
        k.color(rgb(255, 255, 255)),
        k.opacity(1),
        k.fixed(),
    ])

    let flashTimer = 0
    let visible = true

    k.onUpdate(() => {
        flashTimer += k.dt()
        if (flashTimer > 0.5) {
            flashTimer = 0
            visible = !visible
            cont.opacity = visible ? 1 : 0
        }
        if (SYSTEM.ONE_PLAYER) k.go('title')
    })

    k.onKeyPress('enter', () => k.go('title'))
    k.onKeyPress('space', () => k.go('title'))
})

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

k.go('title')
