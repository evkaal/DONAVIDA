package handlers 


import(
	"net/http"
)

func HabilitarCORS(next http.HandlerFunc) http.HandlerFunc{
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST,GET,OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions{
			w.WriteHeader(http.StatusOK)
			return
		}
		

		next (w, r)
	}

}