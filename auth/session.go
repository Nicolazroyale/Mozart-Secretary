package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

const (
	CookieName = "mozart_session"
	SessionTTL = 30 * time.Minute
)

var ErrInvalidSession = errors.New("sesión inválida")

type Session struct {
	UID  int    `json:"uid"`
	User string `json:"u"`
	Name string `json:"n"`
	Role string `json:"r"`
	CSRF string `json:"c"`
	Exp  int64  `json:"e"`
	FP   string `json:"fp"`
}

func NewSession(uid int, user, name, role, fp string) *Session {
	return &Session{
		UID:  uid,
		User: user,
		Name: name,
		Role: role,
		CSRF: randomHex(32),
		Exp:  time.Now().Add(SessionTTL).Unix(),
		FP:   fp,
	}
}

func randomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func Fingerprint(req *http.Request) string {
	h := sha256.New()
	h.Write([]byte(strings.ToLower(req.UserAgent())))
	return hex.EncodeToString(h.Sum(nil))
}

func (s *Session) Expired() bool {
	return time.Now().Unix() > s.Exp
}

func (s *Session) Refresh() *Session {
	s.Exp = time.Now().Add(SessionTTL).Unix()
	return s
}

func sign(secret, payload []byte) []byte {
	m := hmac.New(sha256.New, secret)
	m.Write(payload)
	return m.Sum(nil)
}

func (s *Session) Encode(secret []byte) string {
	payload, _ := json.Marshal(s)
	pl := base64.RawURLEncoding.EncodeToString(payload)
	sg := base64.RawURLEncoding.EncodeToString(sign(secret, payload))
	return pl + "." + sg
}

func Decode(token string, secret []byte) (*Session, error) {
	i := strings.LastIndex(token, ".")
	if i < 0 {
		return nil, ErrInvalidSession
	}
	pl, sg := token[:i], token[i+1:]
	payload, err := base64.RawURLEncoding.DecodeString(pl)
	if err != nil {
		return nil, ErrInvalidSession
	}
	sig, err := base64.RawURLEncoding.DecodeString(sg)
	if err != nil {
		return nil, ErrInvalidSession
	}
	expected := sign(secret, payload)
	if !hmac.Equal(expected, sig) {
		return nil, ErrInvalidSession
	}
	var s Session
	if err := json.Unmarshal(payload, &s); err != nil {
		return nil, ErrInvalidSession
	}
	return &s, nil
}

func SessionFromRequest(r *http.Request, secret []byte) (*Session, error) {
	c, err := r.Cookie(CookieName)
	if err != nil {
		return nil, ErrInvalidSession
	}
	s, err := Decode(c.Value, secret)
	if err != nil {
		return nil, err
	}
	if s.Expired() {
		return nil, ErrInvalidSession
	}
	if s.FP != "" && s.FP != Fingerprint(r) {
		return nil, ErrInvalidSession
	}
	return s, nil
}

func SetSessionCookie(w http.ResponseWriter, s *Session, secret []byte) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    s.Encode(secret),
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(SessionTTL.Seconds()),
	})
}

func RefreshSession(w http.ResponseWriter, s *Session, secret []byte) {
	SetSessionCookie(w, s.Refresh(), secret)
}

func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
}