package db

import (
	"strings"
	"testing"
)

func TestOpenConnectionErrorsOmitCredentials(t *testing.T) {
	const marker = "syntheticCredentialMarker"
	for _, dsn := range []string{
		"postgres://user:" + marker + "@127.0.0.1:invalid/postgres",
		"postgres://user@127.0.0.1:1/postgres?password=" + marker + "&sslmode=disable&connect_timeout=1",
		"host=127.0.0.1 port=1 dbname=postgres connect_timeout=1 password='" + marker + "'",
	} {
		conn, err := Open(dsn)
		if err == nil {
			conn.Close()
			t.Fatal("expected connection failure")
		}
		if strings.Contains(err.Error(), marker) {
			t.Fatal("connection error disclosed synthetic credential")
		}
	}
}
