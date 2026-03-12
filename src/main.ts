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

const STREET_Y_TOP    = 140
const STREET_Y_BOTTOM = 220

const PLAYER_SPEED    = 80
const PLAYER_W        = 18
const PLAYER_H        = 30
const PLAYER_MAX_HP   = 100
const JUMP_VELOCITY   = -260
const GRAVITY         = 600

const PUNCH_REACH        = 36
const PUNCH_DURATION     = 0.18
const COMBO_WINDOW       = 0.45
const KNOCKBACK_SPEED    = 150
const KNOCKBACK_DURATION = 0.25
const HIT_FLASH_DURATION = 0.12

const ENEMY_W              = 18
const ENEMY_H              = 28
const ENEMY_SPEED          = 42
const ENEMY_MAX_HP         = 30
const ENEMY_PUNCH_REACH    = 28
const ENEMY_PUNCH_COOLDOWN = 1.8
const ENEMY_PUNCH_DAMAGE   = 10
const ENEMY_AGGRO_RANGE    = 160

const WORLD_SECTION_W = 336
const NUM_SECTIONS    = 5

const COL_PLAYER:    [number, number, number] = [52,  152, 219]
const COL_ENEMY:     [number, number, number] = [231, 76,  60]
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

// ---------------------------------------------------------------------------
// Asset loading
// ---------------------------------------------------------------------------

k.loadSprite('startscreen', '/startscreen.png')
k.loadSound('titlemusic', '/Bridge Street Run.mp3')

k.loadSprite('jennifer-idle', '/sprites/jennifer/jennifer-idle.png', {
    sliceX: 1,
    sliceY: 1,
    anims: {
        idle: { from: 0, to: 0, loop: true },
    },
})

k.loadSprite('jennifer-walk', '/sprites/jennifer/jennifer-walk.png', {
    sliceX: 16,
    sliceY: 1,
    anims: {
        walk: { from: 0, to: 15, loop: true, speed: 10 },
    },
})

k.loadSprite('jennifer-punch', '/sprites/jennifer/jennifer-punch.png', {
    sliceX: 6,
    sliceY: 2,
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

// ---------------------------------------------------------------------------
// Title music state (persists across title ↔ intro attract loop)
// ---------------------------------------------------------------------------

let titleMusic: ReturnType<typeof k.play> | null = null

function stopTitleMusic() {
    if (titleMusic) {
        titleMusic.stop()
        titleMusic = null
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
        'Your girlfriend will be ' +
        'The Final Sacrifice!\n\n ' +
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
    // World geometry
    // ------------------------------------------------------------------

    k.add([k.rect(totalWorldW, STREET_Y_TOP), k.color(rgb(...COL_SKY)), k.pos(0, 0), k.z(0)])

    const buildings: Array<{ x: number; w: number; h: number }> = [
        { x: 0,    w: 60,  h: 90  }, { x: 70,   w: 80,  h: 70  },
        { x: 160,  w: 50,  h: 110 }, { x: 220,  w: 70,  h: 80  },
        { x: 300,  w: 90,  h: 95  }, { x: 400,  w: 60,  h: 75  },
        { x: 480,  w: 100, h: 100 }, { x: 600,  w: 80,  h: 85  },
        { x: 700,  w: 70,  h: 65  }, { x: 780,  w: 110, h: 105 },
        { x: 900,  w: 60,  h: 90  }, { x: 1000, w: 90,  h: 80  },
        { x: 1100, w: 70,  h: 95  }, { x: 1200, w: 80,  h: 70  },
        { x: 1300, w: 60,  h: 100 }, { x: 1400, w: 90,  h: 85  },
        { x: 1500, w: 70,  h: 90  },
    ]

    for (const b of buildings) {
        const top = STREET_Y_TOP - b.h
        k.add([k.rect(b.w, b.h), k.color(rgb(...COL_BUILDING)), k.pos(b.x, top), k.z(1)])
        for (let wy = top + 8; wy < top + b.h - 8; wy += 18) {
            for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 14) {
                if (Math.random() > 0.4) {
                    k.add([k.rect(8, 10), k.color(rgb(200, 180, 80)), k.pos(wx, wy), k.z(2)])
                }
            }
        }
    }

    k.add([
        k.rect(totalWorldW, STREET_Y_BOTTOM - STREET_Y_TOP + 30),
        k.color(rgb(...COL_STREET)),
        k.pos(0, STREET_Y_TOP),
        k.z(3),
    ])

    for (let lane = 0; lane <= 3; lane++) {
        const ly = STREET_Y_TOP + lane * ((STREET_Y_BOTTOM - STREET_Y_TOP) / 3)
        for (let x = 0; x < totalWorldW; x += 30) {
            k.add([k.rect(18, 1), k.color(rgb(100, 100, 100)), k.pos(x, ly), k.z(4)])
        }
    }

    k.add([k.rect(totalWorldW, 42), k.color(rgb(60, 55, 55)), k.pos(0, STREET_Y_BOTTOM), k.z(3)])

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
        { sectionIndex: 4, count: 4, spawnXRange: [1310, 1450] },
    ]

    let currentWave = 0
    let goArrow: ReturnType<typeof k.add> | null = null

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
    }

    interface Enemy {
        body:   FadeRectObj
        shadow: FadeRectObj
        hpBg:   RectObj
        hpFg:   RectObj
        state:  EnemyState
        destroy(): void
    }

    let waveEnemies: Enemy[] = []

    function spawnEnemy(worldX: number, groundY: number): Enemy {
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
        }

        const shadow = k.add([
            k.rect(ENEMY_W + 4, 5),
            k.color(rgb(0, 0, 0)),
            k.opacity(0.35),
            k.pos(worldX, groundY),
            k.anchor('center'),
            k.z(zFromY(groundY) - 1),
        ]) as FadeRectObj

        const body = k.add([
            k.rect(ENEMY_W, ENEMY_H),
            k.color(rgb(...COL_ENEMY)),
            k.opacity(1),
            k.pos(worldX, groundY),
            k.anchor('bot'),
            k.z(zFromY(groundY)),
        ]) as FadeRectObj

        const hpBg = k.add([
            k.rect(ENEMY_W + 4, 4),
            k.color(rgb(60, 20, 20)),
            k.pos(worldX - 2, groundY - ENEMY_H - 4),
            k.anchor('botleft'),
            k.z(zFromY(groundY) + 1),
        ]) as RectObj

        const hpFg = k.add([
            k.rect(ENEMY_W, 3),
            k.color(rgb(220, 50, 50)),
            k.pos(worldX, groundY - ENEMY_H - 4),
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

    // All sprite frames are 256px tall. Scale to 3x PLAYER_H (90px in-game).
    const JENNIFER_SCALE = (PLAYER_H * 3) / 256

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
    // Combat helpers
    // ------------------------------------------------------------------

    function performPunchHit(reach: number, dir: number, damage: number, isFinisher: boolean) {
        const px = player.pos.x
        const py = ps.groundY

        for (const enemy of waveEnemies) {
            if (enemy.state.dying) continue
            const ex  = enemy.body.pos.x
            const ey  = enemy.state.groundY
            const hit = dir > 0
                ? (ex > px && ex < px + reach)
                : (ex < px && ex > px - reach)
            if (hit && Math.abs(ey - py) < 32) {
                applyDamageToEnemy(enemy, damage, dir, isFinisher)
            }
        }
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
            es.dyingTimer = 0.4
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
        const fireA = pressedA || k.isKeyPressed('z') || k.isKeyPressed('j')
        const fireB = pressedB || k.isKeyPressed('x') || k.isKeyPressed('k')

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
        if (fireA && !ps.punchActive && !ps.knockback) {
            if (!ps.grounded && !ps.jumpKickUsed) {
                ps.jumpKickUsed = true
                ps.punchActive = true
                ps.punchTimer = PUNCH_DURATION * 1.5
                ps.punchDir = ps.facingRight ? 1 : -1
                performPunchHit(PUNCH_REACH * 1.3, ps.punchDir, 18, true)
            } else if (ps.grounded) {
                ps.comboCount = (ps.comboCount % 3) + 1
                ps.comboTimer = COMBO_WINDOW
                ps.punchActive = true
                ps.punchTimer = PUNCH_DURATION
                ps.punchDir = ps.facingRight ? 1 : -1
                const isFinisher = ps.comboCount === 3
                performPunchHit(PUNCH_REACH, ps.punchDir, isFinisher ? 20 : 8, isFinisher)
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
            } else if (k.isKeyDown('left') || k.isKeyDown('a') || k.isKeyDown('right') || k.isKeyDown('d') ||
                       k.isKeyDown('up')   || k.isKeyDown('w') || k.isKeyDown('down')  || k.isKeyDown('s') ||
                       PLAYER_1.DPAD.left || PLAYER_1.DPAD.right || PLAYER_1.DPAD.up || PLAYER_1.DPAD.down) {
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
        const camX = Math.max(CANVAS_W / 2, Math.min(totalWorldW - CANVAS_W / 2, player.pos.x))
        k.camPos(k.vec2(camX, CANVAS_H / 2))

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
                es.dyingTimer -= dt
                const fade = Math.max(0, es.dyingTimer / 0.4)
                enemy.body.opacity = fade
                enemy.shadow.opacity = fade * 0.35
                if (es.dyingTimer <= 0) enemy.destroy()
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
                    enemy.body.color = rgb(...COL_ENEMY)
                }
            }

            const distX = Math.abs(enemy.body.pos.x - player.pos.x)
            const distY = Math.abs(es.groundY - ps.groundY)
            const inAggro = distX < ENEMY_AGGRO_RANGE && distY < 60

            if (!es.knockback && inAggro) {
                const dirX = player.pos.x > enemy.body.pos.x ? 1 : -1
                const dirY = ps.groundY > es.groundY ? 1 : -1
                es.facingRight = dirX > 0
                enemy.body.pos.x += dirX * ENEMY_SPEED * dt
                es.groundY += dirY * ENEMY_SPEED * 0.6 * dt
                es.groundY = Math.max(STREET_Y_TOP + 10, Math.min(STREET_Y_BOTTOM - 5, es.groundY))
            }

            enemy.body.pos.y = es.groundY
            enemy.body.z = zFromY(es.groundY)
            enemy.shadow.pos.x = enemy.body.pos.x
            enemy.shadow.pos.y = es.groundY
            enemy.shadow.z = enemy.body.z - 1

            enemy.hpBg.pos.x = enemy.body.pos.x - 2
            enemy.hpBg.pos.y = es.groundY - ENEMY_H - 4
            enemy.hpFg.pos.x = enemy.body.pos.x
            enemy.hpFg.pos.y = es.groundY - ENEMY_H - 4
            enemy.hpFg.width = Math.max(0, Math.round(ENEMY_W * (es.hp / es.maxHp)))

            es.punchCooldown -= dt
            if (es.punchCooldown <= 0 && inAggro && distX < ENEMY_PUNCH_REACH && distY < 20) {
                es.punchCooldown = ENEMY_PUNCH_COOLDOWN
                if (!ps.knockback) {
                    hitPlayer(ENEMY_PUNCH_DAMAGE, enemy.body.pos.x < player.pos.x ? 1 : -1)
                }
            }
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
            } else {
                ps.scrollLimitX = totalWorldW
                showGoArrow()
                currentWave = waves.length
                waveEnemies = []
            }
        }

        // --- Game over ---
        if (ps.hp <= 0) k.go('gameover')
    })
})

// ---------------------------------------------------------------------------
// Game Over Scene
// ---------------------------------------------------------------------------

k.scene('gameover', () => {
    k.add([k.rect(CANVAS_W, CANVAS_H), k.color(rgb(10, 0, 0)), k.pos(0, 0), k.fixed()])

    k.add([
        k.text('GAME OVER', { size: 32 }),
        k.pos(CANVAS_W / 2, 85),
        k.anchor('center'),
        k.color(rgb(220, 50, 50)),
        k.fixed(),
    ])

    k.add([
        k.text('Your girlfriend awaits...', { size: 8 }),
        k.pos(CANVAS_W / 2, 132),
        k.anchor('center'),
        k.color(rgb(180, 160, 160)),
        k.fixed(),
    ])

    k.add([
        k.text('And the pizza is getting cold.', { size: 8 }),
        k.pos(CANVAS_W / 2, 147),
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
        if (SYSTEM.ONE_PLAYER) k.go('title')
    })

    k.onKeyPress('enter', () => k.go('title'))
    k.onKeyPress('space', () => k.go('title'))
})

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

k.go('title')
