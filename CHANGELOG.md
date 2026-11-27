# Change Log — Fonduri

## 1.13.0 · 27 noiembrie 2026
### Plățile din Apple Pay, cu listă de aprobare
Fonduri poate primi plățile făcute cu Apple Pay, trimise de o automatizare din Comenzi rapide prin orașul DSL. Pe cardul principal, un comerciant care are regulă cu intrare directă devine cheltuială în categoria și fondul regulii. Restul așteaptă în lista De aprobat: plățile cu alte carduri, comercianții noi și plățile în altă monedă. Aceeași plată nu intră de două ori. Dacă ai trecut-o deja de mână în aceeași zi, cu aceeași sumă, lista te avertizează.
În De aprobat alegi categoria și fondul, apoi aprobi sau ștergi plata. „Aprobă mereu” ține minte comerciantul, cu categoria și fondul alese, iar plățile următoare de la el, făcute cu cardul principal, intră singure. O plată în dolari se poate trece direct ca depunere crypto, cu suma și data deja completate.
### Plățile de aprobat pe Acasă
Pe Acasă apare un card cu numărul plăților de aprobat și suma lor. Dacă o plată așteaptă de mai mult de 3 zile, cardul arată asta. Numărul de zile se schimbă din setări.
### Setări → Plăți automate
Aici alegi cardul principal, după numele din Wallet sau dintre cardurile văzute deja, și numărul de zile pentru atenționare. Tot aici vezi, adaugi, modifici și ștergi regulile. Regulile de început acoperă lanțuri mari de magazine, farmacii și transport. Nu contează literele mari, spațiile sau diacriticele. Butonul de plată de test pune o plată de 1 leu în De aprobat, ca să încerci lista.
Primirea de la oraș funcționează după ce actualizezi și orașul. Până atunci aplicația nu se schimbă. Backup-urile vechi primesc singure regulile de început și o listă goală.

## 1.12.1 · 27 noiembrie 2026
### Mesajul corect la bancnote
În Pușculiță, după ce adaugi sau scoți bancnote, mesajul de sus scria de exemplu „+1 20 lei”, care se citea ca 120 lei, indiferent câte bancnote puneai. Acum arată câte bucăți, valoarea și câte ai în total, de exemplu „Pus deoparte 5 × 20 lei = 100 lei · ai 12 buc.”. Mesajul e la fel la butoanele + și − și la Adaugă mai multe. La euro arată suma în euro. Datele din pușculiță nu se schimbă.

## 1.12.0 · 23 noiembrie 2026
### Sincronizare automată cu orașul
Fonduri trimite singur portofoliul către Orașul DSL, prin Tailscale, fără QR și fără confirmare. Trimiterea pornește când deschizi sau redeschizi aplicația, după deblocare, și la un minut după ce modifici ceva. Se trimite doar dacă s-a schimbat ceva, sau o dată pe zi. Dacă Tailscale e oprit sau PC-ul nu răspunde, aplicația nu te deranjează și încearcă la următoarea deschidere. În Setări → Orașul DSL vezi ultima sincronizare reușită, motivul ultimei încercări nereușite și butonul Trimite acum.
Asocierea se face o singură dată. În aplicația orașului generezi o cheie de asociere, o lipești în Setări → Orașul DSL și apeși Asociază. Telefonul își creează o cheie proprie care nu poate fi exportată, iar orașul primește doar partea ei publică. Fiecare trimitere este semnată cu această cheie și merge criptată prin Tailscale. Adresa orașului rămâne doar pe telefon. Pleacă aceleași date ca înainte: soldurile fondurilor, monedele și pozițiile Earn. Istoricul complet rămâne pe telefon. Dezasocierea oprește trimiterile.
### Sincronizarea prin QR mutată la final
Scanarea QR-ului din oraș merge doar pe același Wi-Fi, iar orașul nu mai ascultă pe Wi-Fi. Butonul a fost mutat sub „Sincronizarea veche prin QR”, cu această explicație. Asocierea veche și cheia salvată nu se schimbă.

## 1.11.1 · 23 noiembrie 2026
### Butonul Calculator de dobândă se apasă
Pe ecranul Economii, la un cont configurat, butonul Calculator de dobândă apărea doar ca text, iar apăsarea lui nu făcea nimic. Acum este un buton întreg sub Depun, Retrag și Corectez și deschide calculatorul.

## 1.11.0 · 23 noiembrie 2026
### Calculator de dobândă în Economii
Pe ecranul Economii, butonul Calculator de dobândă deschide un calculator cu trei moduri. Cât câștig arată câștigul net pe zi, pe săptămână, pe lună și pe an pentru o sumă. Depun arată soldul după o perioadă cu depuneri lunare sau săptămânale, cât ai depus și câtă dobândă ai primit, cu un grafic și un tabel pe ani sau pe luni. Țintă calculează de ce sumă ai nevoie ca să câștigi un anumit venit sau cât trebuie să depui ca să ajungi la o sumă.
Calculatorul pornește cu dobânda, impozitul și soldul contului și folosește aceeași regulă ca acesta: dobândă zilnică, primită lunar în ziua plății și adăugată la sold, cu impozitul reținut. Poți schimba dobânda doar în calculator, fără să modifici contul. Calculatorul nu salvează nimic.

## 1.10.0 · 22 noiembrie 2026
### Setări din orice ecran
Iconița de setări apare acum pe toate ecranele: Acasă, Fonduri, Investiții, Statistici, Istoric și Istoric crypto și Earn. Butonul Înapoi din Setări te întoarce în ecranul din care ai venit.
### Setările potrivite ecranului, primele
Când deschizi Setările dintr-un ecran, sus apar întâi grupurile care țin de el, sub titlul „Pentru …”, apoi restul. De exemplu, din Crypto vezi întâi Crypto și exchange-ul, apoi Valute în Investiții. Din Economii vezi întâi contul de economii, iar din Statistici categoriile și luna financiară. Butonul „Arată în ordinea obișnuită” revine la lista completă, în ordinea de dinainte.

## 1.9.0 · 22 noiembrie 2026
### Prețul monedelor foarte ieftine
Prețul pe bucată se afișează cu destule zecimale și la monedele de fracțiuni de cent, de exemplu 0,000003463 $ în loc de 0,0000 $. Regula se aplică în formularul de cumpărare și vânzare, la detaliile fiecărei monede și în graficul ei. Sumele de peste un dolar rămân cu două zecimale.
### Valută separată pentru crypto și economii
În Setări → Valute în Investiții alegi separat valuta pentru Total și Raport, pentru Crypto și Earn și pentru contul de economii. De exemplu, crypto în dolari și economiile în lei. O zonă lăsată pe „Ca la total” urmează valuta generală. În Raport, blocul fiecărei investiții folosește valuta zonei lui. Setările vechi rămân valabile pentru toate zonele.
### Modifici sau ștergi operațiunile crypto din istoric
În Istoric crypto și Earn, cumpărările, vânzările, depunerile și retragerile au butoanele Modifică și Șterge. Modificarea deschide formularul completat și înlocuiește operațiunea veche, iar depunerile și retragerile își actualizează și mișcarea din fonduri. Operațiunea modificată arată data modificării.
Dacă schimbarea ar lăsa o vânzare ulterioară fără monede sau o poziție Earn fără acoperire, nu se salvează nimic și primești un mesaj cu ce lipsește. Ștergerea unei depuneri crypto din lista de tranzacții trece prin aceeași verificare. Auto-subscribe ajustează Earn-ul după modificare.

## 1.8.0 · 10 noiembrie 2026
### Auto-subscribe pe fiecare monedă în Earn
În Investiții → Earn, cardul Auto-subscribe are un comutator pentru fiecare monedă din portofoliu, iar USDT și USDC apar împreună. La pornire introduci APR-ul Flexible. Tot ce e liber în Spot din moneda respectivă trece imediat în Earn Flexible. Cumpărările următoare intră automat, iar vânzările se scot automat din Earn.
Recompensa zilnică se adaugă la suma care produce. La fiecare transfer automat, recompensa de până atunci este salvată ca recompensă Earn estimată, fără să se schimbe ziua de plată. În venitul pasiv, aceste recompense apar la Earn estimat până când confirmi soldul real din poziție. Transferurile, pornirea și oprirea apar în Istoric crypto și Earn. Oprirea nu scoate nimic din Earn. O poziție Locked nouă din aceeași monedă micșorează automat partea Flexible.
### Pun în Earn după miezul nopții
Între 00:00 și 02:00, adăugarea unei poziții Earn cu data de azi era respinsă cu mesajul că data este în viitor. Data de azi folosește acum ora curentă, iar o dată trecută începe la miezul nopții, ora României.

## 1.7.0 · 9 noiembrie 2026
### Salvează direct din tastatură
La Tranzacție nouă, butonul Salvează ocupă ultima coloană a tastaturii și arată suma introdusă. Butonul rămâne vizibil fără derulare la cheltuieli, venituri, retrageri din fond și mutări.
Nota și data sunt pe un singur rând sub tastatură. Data apare scurt, de exemplu „Azi, 14:30”. La atingere se deschide selectorul de dată al telefonului. Pe ecranele mici, tastele și spațiile sunt puțin mai compacte.
### Un singur câștig total la crypto
Cardul crypto afișează câștigul total față de banii depuși, în locul celor două valori separate în lei și dolari. Secțiunea „De unde vine” împarte câștigul în prețul monedelor, recompensele Earn, vânzările încasate, comisioanele la depunere și efectul cursului dolarului cu corecturile manuale. Componentele adunate dau totalul.
### Valută principală și secundară
Setări → Valute în Investiții permite alegerea valutei principale și a celei secundare: lei, dolari sau euro. Valuta secundară poate fi dezactivată. Alegerea se aplică la raport, crypto, Earn și economii, la cursul BCE din ziua curentă. Cursul euro se descarcă împreună cu cel al dolarului. Backupurile vechi pornesc cu lei ca valută principală și dolari ca valută secundară.

## 1.6.3 · 5 noiembrie 2026
### Tastatura rămâne pe loc la venituri
Împărțirea între fonduri are spațiu rezervat înainte să introduci prima cifră. Dacă ai multe fonduri, poți derula în interiorul împărțirii.
### Scurtături cu nume și sumă
Poți salva configurația din formular separat sau odată cu tranzacția. Selectarea unei scurtături completează suma, tipul, fondurile, nota și opțiunile euro. Data este cea curentă. Scurtăturile vechi care nu conțin o sumă cer introducerea ei.
### Feedback discret la apăsare
La navigarea între pagini, conținutul apare gradual timp de 140 ms. Tastele și butoanele schimbă discret culoarea la apăsare. Tranzițiile noi respectă preferința de mișcare redusă.

### Verificarea actualizărilor din Setări
Butonul de lângă versiune caută o actualizare și reîncarcă aplicația când există o versiune nouă. Afișează un mesaj dacă versiunea este actuală sau dacă lipsește conexiunea.

## 1.6.2 · 5 noiembrie 2026
### Istoricul versiunilor în Setări
Deschide Change Log și apasă pe titlul unei modificări pentru detalii. Istoricul este inclus în copia offline a aplicației.
### Regula pentru actualizări
Codex și Claude au instrucțiuni în proiect să citească istoricul înainte de lucru și să adauge aici fiecare schimbare publicată.

## 1.6.1 · 5 noiembrie 2026
### Previzualizarea depunerilor
Suma primită și comisionul se actualizează în timpul tastării, inclusiv pentru sume cu virgulă zecimală. Un răspuns întârziat pentru altă dată nu mai înlocuiește cursul selectat.

## 1.6.0 · 5 noiembrie 2026
### Istoric crypto și Earn
Depunerile, cumpărările, vânzările, corecturile și mișcările între Spot și Earn apar într-un istoric căutabil după dată, monedă sau operațiune.
### Recompense separate de corecturi
Corecturile de sold și transferurile sunt separate de recompensele confirmate. Diferențele ambigue din backupurile vechi se pot clasifica din Setări.
### Corecturi de sold și de preț mediu
Corecturile de fonduri și crypto se găsesc în Setări. Modificarea exclusivă a prețului mediu păstrează cantitatea și calendarul Earn.
### Sugestii pentru monede
După trei caractere, formularele sugerează monede după simbol sau nume. Catalogul local funcționează și offline.
### Tastatură stabilă
La tranzacții se actualizează previzualizarea. La cheltuieli, tastatura numerică actualizează suma și păstrează nota introdusă.
### Sincronizare cu Orașul DSL
Telefonul scanează QR-ul temporar din oraș. Aprobarea cu cheia de acces permite transferul criptat al portofoliului prin rețeaua locală.

## 1.5.0 · 3 noiembrie 2026
### Dobândă și venit pasiv
Economiile urmăresc perioadele de plată și dobânda calculată pe sold zilnic. Raportul include venitul pasiv.
### Corecturi de import
Au fost introduse corecturi pentru solduri, cantități și costuri crypto. Câmpurile de corectare a monedelor au primit etichete explicite.
