TODO:

FRONDEND:

1. TODO Gif/Fun Button Switch Fixen
2. TODO Kcal Goal anpassen so das es für Alle Perioden funktioniert
4. TODO Modularisierung Abschließen
5. TODO Bessere organisiation der Funktionen und potenzielle weitere auslagerung
   CACHING:
   1. wenn der user zum ersten mal die website besucht laden wir alle daten in den local storage the browsers
   2. dann füllen wir die website aus und alles passt
   3. zur laufzeit haben wir alle daten in einem state objekt
   4. ändern wir ein item so wird die änderung im cache durchgeführt und die gleiche anfrage an den server gesendet
   5. startet der user seinen browser erneut und sein tab ist noch offen so laden wir die werte aus dem cache dennoch wird eine anfrage an den server gesendet um sychronität auf meherer platformem zu gewährleisten

BACKEND:

1. TODO CRUD und API logik anpassen so das nur noch nötige daten ausgeliefert werden
# 
2. DATENBANK:

   1. TODO: wir benötigen eine locale datenbank wie SQLite damit wir sychron sachen testen können, das machst du David
   # datenbank ist jetzt async und backend funktional überarbeitet für async