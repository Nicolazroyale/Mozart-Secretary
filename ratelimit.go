package main

import (
	"sync"
	"time"
)

type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	cap     float64
	refill  float64 // tokens por segundo
}

type bucket struct {
	tokens float64
	last   time.Time
}

func NewRateLimiter(capacity int, refill float64) *RateLimiter {
	return &RateLimiter{
		buckets: make(map[string]*bucket),
		cap:     float64(capacity),
		refill:  refill,
	}
}

// Allow devuelve (permitido, segundos hasta el próximo token si no permitido).
func (rl *RateLimiter) Allow(key string) (bool, int) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok {
		rl.buckets[key] = &bucket{tokens: rl.cap, last: now}
		return true, 0
	}
	elapsed := now.Sub(b.last).Seconds()
	b.tokens += elapsed * rl.refill
	if b.tokens > rl.cap {
		b.tokens = rl.cap
	}
	b.last = now
	if b.tokens >= 1 {
		b.tokens--
		return true, 0
	}
	if len(rl.buckets) > 10000 {
		rl.buckets = make(map[string]*bucket)
	}
	retry := int((1-b.tokens)/rl.refill) + 1
	if retry < 1 {
		retry = 1
	}
	return false, retry
}